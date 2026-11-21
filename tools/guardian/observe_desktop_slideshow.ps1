# Read-only Windows IDesktopWallpaper observer. No setters are implemented or called.
# Times identify completed polling reads, not the compositor transition start.
# Persist only hashes of wallpaper identities; never file paths or image contents.
param([ValidateRange(0,600)][int]$DurationSeconds=0,[string]$Output='.cache/cadence-slideshow-status.json')
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
[ComImport,Guid("B92B56A9-8B55-4E14-9A89-0199BBB6F93B"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IWallpaperAudit {
 void Unused0();
 void GetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string monitor,[MarshalAs(UnmanagedType.LPWStr)] out string path);
 void GetMonitorDevicePathAt(uint index,[MarshalAs(UnmanagedType.LPWStr)] out string monitor);
 void GetMonitorDevicePathCount(out uint count);
 void Unused4(); void Unused5(); void Unused6(); void Unused7(); void Unused8(); void Unused9(); void Unused10(); void Unused11();
 void GetSlideshowOptions(out uint flags,out uint tick);
 void Unused13();
 void GetStatus(out uint state);
 void Unused15();
}
public static class WallpaperAudit {
 public static object Read(){
  var obj=Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("C2CF3110-460E-4FC1-B9D0-8A1C0C9CC4BD")));
  try {var api=(IWallpaperAudit)obj;uint state,flags,tick,count;api.GetStatus(out state);api.GetSlideshowOptions(out flags,out tick);api.GetMonitorDevicePathCount(out count);var hashes=new string[count];
   for(uint i=0;i<count;i++){string id,path;api.GetMonitorDevicePathAt(i,out id);api.GetWallpaper(id,out path);using(var hash=SHA256.Create())hashes[i]=BitConverter.ToString(hash.ComputeHash(Encoding.UTF8.GetBytes(path??""))).Replace("-","").ToLowerInvariant();}
   return new {at=DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),state,flags,intervalMs=tick,monitors=count,wallpaperIdentityHashes=hashes};
  } finally {Marshal.FinalReleaseComObject(obj);}
 }
}
'@
$rows=[System.Collections.Generic.List[object]]::new()
$end=[DateTimeOffset]::UtcNow.AddSeconds($DurationSeconds)
$previous=''
do {
 $row=[WallpaperAudit]::Read()
 $signature=($row.wallpaperIdentityHashes -join ',')+':'+$row.state
 if($signature -ne $previous){$rows.Add($row);$previous=$signature}
 if($DurationSeconds -gt 0){Start-Sleep -Milliseconds 100}
} while([DateTimeOffset]::UtcNow -lt $end)
$rows.Add([WallpaperAudit]::Read())
@{readOnly=$true;samplePeriodMs=100;timestampMeaning='Completed polling read, not native transition onset';started=$rows[0].at;finished=$rows[$rows.Count-1].at;changes=$rows} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $Output
Get-Content -LiteralPath $Output
