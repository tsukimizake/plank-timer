set shell := ["nu", "-c"]

host := "tsukimi@192.168.50.232"
target := "/home/tsukimi/train"

deploy:
  npm run typecheck
  scp train.ts {{host}}:{{target}}/train.ts.new
  ssh {{host}} mv {{target}}/train.ts.new {{target}}/train.ts
  ssh {{host}} sudo -n systemctl restart train-bridge.service
  ssh {{host}} curl --retry 5 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:8765/health
