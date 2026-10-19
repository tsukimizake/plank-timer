# train

Google Home スピーカーのトレーニングタイマー

## 構成

Google Home → Home Assistant の script → `rest_command` → Pi の `train-bridge.service` → `train.ts` → Home Assistant の TTS。

Pi では `/home/tsukimi/train` に配置し、HTTP ブリッジは `127.0.0.1:8765` だけで待ち受けます。トークンは `/home/tsukimi/.config/train/environment` と Home Assistant の `secrets.yaml` に保存し、リポジトリには含めません。

## 種目の追加

`train.ts` の `WORKOUTS` に種目を追加します。開始前の準備時間は全種目共通で5秒です。`seconds` は各運動の秒数、`cues` は残り何秒で読み上げるかを降順に並べます。`rounds` は `steps` 全体を繰り返す回数です。現在は `plank` と、30秒運動・30秒休憩を6セット行う `kettlebell_swing` があります。

Pi へ `train.ts` を反映して `sudo systemctl restart train-bridge.service` を実行します。音声で起動する種目には `home-assistant/scripts.yaml` に対応する script を追加し、`rest_command.train_run` に `workout` 名を渡します。その script を Google Assistant に公開します。

## 操作

Pi で `node /home/tsukimi/train/train.ts list` を実行すると種目一覧を確認できます。Home Assistant の `script.train_start` がプランク、`script.train_kettlebell_swing` がケトルベルスイング、`script.train_stop` が停止です。ブリッジの状態は `curl http://127.0.0.1:8765/health` で確認できます。Google Home には「プランクを起動して」「ケトルベルスイングを起動して」と話しかけます。

## Google Home の手動連携

Home Assistant を固定の HTTPS URL で外部から利用できるようにした後、Google Home Developer Console に Cloud-to-Cloud 連携を作成します。Google がアクセスする URL は `https://HOST/auth/authorize`、`https://HOST/auth/token`、`https://HOST/api/google_assistant` です。Google プロジェクトの ID とサービスアカウント JSON を用意し、`home-assistant/google_assistant.yaml.example` を参考に設定します。Google Home アプリで `[test]` 付きの連携先をリンクし、公開した script を音声ルーティンのアクションに指定します。

詳細: https://www.home-assistant.io/integrations/google_assistant/
