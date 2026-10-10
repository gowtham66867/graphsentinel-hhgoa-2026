import urllib.error

from fraud_agent.graph_probe import probe_live_retrieval


def test_missing_connection_falls_back_without_call(monkeypatch):
    monkeypatch.delenv("TIGERGRAPH_HOST", raising=False)
    result = probe_live_retrieval()
    assert result["mode"] == "offline_export"
    assert result["attempts"] == 0


def test_transient_failure_retries_once_then_falls_back():
    calls = []

    class BrokenClient:
        def query(self, *_args, **_kwargs):
            calls.append(1)
            raise urllib.error.URLError("offline")

    result = probe_live_retrieval(lambda: BrokenClient(), attempts=100)
    assert result["mode"] == "offline_export"
    assert result["attempts"] == 2
    assert len(calls) == 2


def test_nonempty_query_result_verifies_live_retrieval():
    class WorkingClient:
        def query(self, *_args, **_kwargs):
            return {"results": [{"Tx": [{"v_id": "3478561"}]}]}

    result = probe_live_retrieval(lambda: WorkingClient())
    assert result["live_retrieval_verified"]
    assert result["attempts"] == 1


def test_rejected_query_does_not_retry():
    calls = []

    class RejectedClient:
        def query(self, *_args, **_kwargs):
            calls.append(1)
            raise RuntimeError("unauthorized")

    result = probe_live_retrieval(lambda: RejectedClient())
    assert result["attempts"] == 1
    assert len(calls) == 1
