
function add_qs(filename) {
  path = root filename
  cmd = "sha1sum " path " | cut -d ' ' -f1 | head -c 8"
  cmd | getline sum
  close(cmd)
  return filename "?" sum
}

/<link rel="stylesheet" href="\/css\/[^"]+">/ {
    match($0, /href="([^"]+)"/, m)
    with_qs = add_qs(m[1])
    print gensub(/(.*href=")[^"]+(".*)/, "\\1" with_qs "\\2", "g", $0)
    next
}

/<script type="text\/javascript" src="\/js\/[^"]+">/ {
    match($0, /src="([^"]+)"/, m)
    with_qs = add_qs(m[1])
    print gensub(/(.*src=")[^"]+(".*)/, "\\1" with_qs "\\2", "g", $0)
    next
}

{ print $0 }
