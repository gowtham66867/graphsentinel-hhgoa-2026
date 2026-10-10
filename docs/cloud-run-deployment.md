# Cloud Run deployment gate

The Cloud Run image serves the **offline GraphSentinel export** in `web/dist/`.
It does not connect to TigerGraph or an LLM, record microphone audio, or execute
fraud actions. The `/status` endpoint reports `source_mode=offline_export`.

## Local verification (no Google Cloud usage)

```bash
docker build --platform linux/amd64 -t graphsentinel:cloudrun-local web
docker run --rm -p 127.0.0.1:8088:8080 graphsentinel:cloudrun-local
# In a separate terminal: curl --fail http://127.0.0.1:8088/status
```

Run `python3 -m pytest -q tests/test_static_server.py` for the HTTP smoke test.

## Mandatory gate before any cloud operation

Do not build, push, enable APIs, or deploy until all of the following are
verified with the team lead:

1. The **exact intended Google Cloud project ID** and deployment region.
2. An authenticated Google Cloud account with access to that project.
3. The project's linked Cloud Billing account and payment profile.
4. Any payment method excluded by the project owner is neither a primary nor
   backup method for that billing profile; confirm the intended method.
5. The team lead accepts that Cloud Run, image storage/build, networking, and
   other cloud usage may incur charges even with a zero-minimum-instance
   configuration. A budget alert is a notification, not a hard spending cap.

The local `gcloud` default is not evidence that it is the correct GraphSentinel
project. Never deploy to it by default.

After this gate, create an Artifact Registry repository and publish the image
using the verified project/region, or follow the current official Cloud Run
console workflow. Configure request-based billing, minimum instances `0`, a
small maximum instance count, and authentication according to the intended
audience. Verify the `/status` response and the offline-source label after
deployment. None of these limits guarantee a zero bill.

The Docker context intentionally excludes benchmark source data, Git metadata,
local configuration, and secrets. Only `server.py` and the exported dashboard
are copied into the image.
