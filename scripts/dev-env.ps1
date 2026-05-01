$ErrorActionPreference = "Stop"

# Dot-source this script in PowerShell so the Visual Studio and PATH changes
# are applied to your current shell session:
#   . .\scripts\dev-env.ps1

$vsDevShell = "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\Common7\Tools\Launch-VsDevShell.ps1"
& $vsDevShell -Arch amd64 -HostArch amd64

$env:PATH = "C:\Strawberry\perl\bin;C:\Strawberry\c\bin;$env:PATH"

Write-Host "Verifying Perl:"
where.exe perl
perl -V:osname

Write-Host "Verifying linker:"
where.exe link

Write-Host "Verifying Rust toolchain:"
rustc -vV
