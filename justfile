set shell := ["nu", "-c"]

plank: 
  say "start plank in 5 sec"
  sleep 5sec
  say "start diagonal plank"
  just count_30
  say "switch"
  just count_30
  say "side plank"
  just count_30
  say "switch"
  just count_30
  say "back plank"
  just count_30
  say "end"

count_30:
  sleep 10sec
  say "20"
  sleep 10sec
  say "10"
  sleep 10sec
  say "done"
