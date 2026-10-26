using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

// Tray launcher: starts the bundled Node server without any console window and stops it when it quits.
static class Program
{
    const string Title = "Team dashboard";
    const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";

    static string url;
    static Process server;
    static NotifyIcon tray;
    static IntPtr job;
    static readonly List<string> errorTail = new List<string>();

    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles();
        string root = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
        string backend = Path.Combine(root, "backend");
        string nodeExe = Path.Combine(root, "node", "node.exe");
        string envFile = Path.Combine(backend, ".env");

        if (!File.Exists(envFile)) Fail("Fichier backend\\.env manquant : copiez backend\\.env.example en backend\\.env et renseignez-le.");
        Match m = Regex.Match(File.ReadAllText(envFile), @"^\s*PORT\s*=\s*(\d+)", RegexOptions.Multiline);
        if (!m.Success) Fail("PORT introuvable dans backend\\.env.");
        string port = m.Groups[1].Value;
        url = "http://localhost:" + port;

        bool created;
        using (new Mutex(true, "Global\\TeamDashboardLauncher", out created))
        {
            // Single instance: a second launch just opens the browser.
            if (!created) { Process.Start(url); return; }

            FreePort(port, nodeExe);
            StartServer(nodeExe, backend);
            BuildTray();
            Process.Start(url);
            Application.Run();

            tray.Visible = false;
            StopServer();
        }
    }

    static void Fail(string message)
    {
        MessageBox.Show(message, Title, MessageBoxButtons.OK, MessageBoxIcon.Error);
        Environment.Exit(1);
    }

    // A leftover server of this package is stopped silently; any other program needs confirmation.
    static void FreePort(string port, string nodeExe)
    {
        int pid = ListenerPid(port);
        if (pid == 0) return;
        Process other = null;
        string path = null;
        try { other = Process.GetProcessById(pid); path = other.MainModule.FileName; } catch { }
        bool ours = path != null && string.Equals(path, nodeExe, StringComparison.OrdinalIgnoreCase);
        if (!ours)
        {
            string name = other != null ? other.ProcessName : "un autre programme";
            DialogResult answer = MessageBox.Show(
                "Le port " + port + " est utilise par " + name + " (PID " + pid + "). Arreter ce programme et continuer ?",
                Title, MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
            if (answer != DialogResult.Yes) Environment.Exit(1);
        }
        try { if (other != null) { other.Kill(); other.WaitForExit(3000); } } catch { }
    }

    static int ListenerPid(string port)
    {
        var info = new ProcessStartInfo("netstat", "-ano -p TCP")
        {
            UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true,
        };
        using (Process p = Process.Start(info))
        {
            string output = p.StandardOutput.ReadToEnd();
            p.WaitForExit();
            Match m = Regex.Match(output, @"^\s*TCP\s+\S+:" + port + @"\s+\S+\s+LISTENING\s+(\d+)", RegexOptions.Multiline);
            return m.Success ? int.Parse(m.Groups[1].Value) : 0;
        }
    }

    static void StartServer(string nodeExe, string backend)
    {
        var info = new ProcessStartInfo(nodeExe, "dist\\server.js")
        {
            WorkingDirectory = backend, UseShellExecute = false, CreateNoWindow = true,
            RedirectStandardOutput = true, RedirectStandardError = true,
        };
        StreamWriter log = OpenLog(Path.Combine(backend, "dashboard.log"));
        StreamWriter errLog = OpenLog(Path.Combine(backend, "dashboard.err.log"));
        server = new Process { StartInfo = info };
        server.OutputDataReceived += (s, e) => { if (e.Data != null) lock (log) log.WriteLine(e.Data); };
        server.ErrorDataReceived += (s, e) =>
        {
            if (e.Data == null) return;
            lock (errLog) errLog.WriteLine(e.Data);
            lock (errorTail) { errorTail.Add(e.Data); if (errorTail.Count > 5) errorTail.RemoveAt(0); }
        };
        server.Start();
        server.BeginOutputReadLine();
        server.BeginErrorReadLine();
        BindToLifetime(server);
    }

    static StreamWriter OpenLog(string file)
    {
        var stream = new FileStream(file, FileMode.Create, FileAccess.Write, FileShare.ReadWrite);
        return new StreamWriter(stream) { AutoFlush = true };
    }

    static void BuildTray()
    {
        tray = new NotifyIcon
        {
            Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath),
            Text = Title + " (" + url + ")",
            Visible = true,
        };
        var menu = new ContextMenuStrip();
        menu.Items.Add("Ouvrir le dashboard", null, (s, e) => Process.Start(url));
        var auto = new ToolStripMenuItem("Demarrer avec Windows") { CheckOnClick = true, Checked = IsAutoStart() };
        auto.Click += (s, e) => SetAutoStart(auto.Checked);
        menu.Items.Add(auto);
        menu.Items.Add("Quitter", null, (s, e) => Application.Exit());
        tray.ContextMenuStrip = menu;
        tray.DoubleClick += (s, e) => Process.Start(url);

        // Server crashed (invalid configuration...): report and stop.
        var watch = new System.Windows.Forms.Timer { Interval = 2000 };
        watch.Tick += (s, e) =>
        {
            if (!server.HasExited) return;
            watch.Stop();
            tray.Visible = false;
            string detail;
            lock (errorTail) detail = string.Join("\n", errorTail.ToArray());
            MessageBox.Show("Le serveur s'est arrete.\n" + detail, Title, MessageBoxButtons.OK, MessageBoxIcon.Error);
            Application.Exit();
        };
        watch.Start();
    }

    static bool IsAutoStart()
    {
        using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RunKey))
            return key != null && key.GetValue(Title) != null;
    }

    static void SetAutoStart(bool enabled)
    {
        using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RunKey, true))
        {
            if (enabled) key.SetValue(Title, "\"" + Application.ExecutablePath + "\"");
            else key.DeleteValue(Title, false);
        }
    }

    static void StopServer()
    {
        try { if (!server.HasExited) { server.Kill(); server.WaitForExit(3000); } } catch { }
    }

    // The job object kills the server if the launcher dies for any reason (end task, crash...).
    static void BindToLifetime(Process process)
    {
        job = CreateJobObject(IntPtr.Zero, null);
        var limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        limits.BasicLimitInformation.LimitFlags = 0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        int size = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
        IntPtr ptr = Marshal.AllocHGlobal(size);
        try
        {
            Marshal.StructureToPtr(limits, ptr, false);
            SetInformationJobObject(job, 9, ptr, (uint)size);
        }
        finally { Marshal.FreeHGlobal(ptr); }
        AssignProcessToJobObject(job, process.Handle);
    }

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit, PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass, SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct IO_COUNTERS
    {
        public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount;
        public ulong ReadTransferCount, WriteTransferCount, OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    static extern IntPtr CreateJobObject(IntPtr attributes, string name);

    [DllImport("kernel32.dll")]
    static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint length);

    [DllImport("kernel32.dll")]
    static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
}
