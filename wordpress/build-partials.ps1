# Regenerates the blog's header and footer from the static homepage (index.html), so the WordPress blog pages always match the site.
# Run from anywhere:  powershell -File wordpress\build-partials.ps1   then upload wordpress\shashwat-blog-layout\partials\* to
# wp-content/plugins/shashwat-blog-layout/partials/ on the server (see wordpress/README.md).
Set-Location (Join-Path $PSScriptRoot '..')
$u = New-Object System.Text.UTF8Encoding($false)
$dir = 'wordpress\shashwat-blog-layout\partials'
New-Item -ItemType Directory -Force $dir | Out-Null
$s = [IO.File]::ReadAllText((Resolve-Path 'index.html').Path, $u) -replace "`r`n", "`n"

# header: from the floating contact bar through the end of the navbar
$a = $s.IndexOf('<!-- Floating action bar')
$b = $s.IndexOf('</nav>', $a) + 6
if ($a -lt 0 -or $b -lt 10) { throw 'header range not found' }
$h = $s.Substring($a, $b - $a)
# the Blog link is the active one on blog pages (desktop and mobile menu)
$h = $h.Replace('<a href="/" class="nav-link active text-sm', '<a href="/" class="nav-link text-sm')
$h = $h.Replace('<a href="/blog/" class="nav-link text-sm', '<a href="/blog/" class="nav-link active text-sm')
$h = $h.Replace('<a href="/" class="text-sm font-medium text-white transition-all">Home</a>', '<a href="/" class="text-sm font-medium text-white/70 hover:text-white transition-all">Home</a>')
$h = $h.Replace('<a href="/blog/" class="text-sm font-medium text-white/70 hover:text-white transition-all">Blog</a>', '<a href="/blog/" class="text-sm font-medium text-white transition-all">Blog</a>')

# footer
$fa = $s.IndexOf('<footer')
$fb = $s.IndexOf('</footer>', $fa) + 9
if ($fa -lt 0 -or $fb -lt 20) { throw 'footer range not found' }
$f = $s.Substring($fa, $fb - $fa)

$note = '<!-- generated from index.html by wordpress/build-partials.ps1: do not edit by hand -->'
[IO.File]::WriteAllText((Join-Path (Get-Location) "$dir\header.html"), "$note`n$h`n", $u)
[IO.File]::WriteAllText((Join-Path (Get-Location) "$dir\footer.html"), "$note`n$f`n", $u)
"header $($h.Length) chars, footer $($f.Length) chars"
