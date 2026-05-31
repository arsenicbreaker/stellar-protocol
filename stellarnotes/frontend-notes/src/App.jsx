import { useCallback, useEffect, useMemo, useState } from "react";
import { StellarContractsKit, isContractKitError } from "stellar-contracts-kit";
import "./App.css";
import { CONTRACT_ID } from "./contracts/notescean.js";

const NETWORK = "testnet";

function truncateAddress(address, size = 5) {
  if (!address) return "";
  return `${address.slice(0, size)}...${address.slice(-size)}`;
}

function formatContractError(error) {
  if (isContractKitError(error)) {
    const messages = {
      WALLET_NOT_FOUND: "Wallet belum terpasang. Pilih install wallet dari modal koneksi.",
      WALLET_REJECTED: "Koneksi atau transaksi dibatalkan dari wallet.",
      WALLET_NETWORK_MISMATCH: "Wallet belum berada di Stellar testnet.",
      WALLET_NOT_CONNECTED: "Hubungkan wallet sebelum mengirim transaksi.",
      CONTRACT_NOT_FOUND: "Smart contract tidak ditemukan di testnet.",
      CONTRACT_RESTORE_REQUIRED: "Data kontrak perlu di-restore sebelum bisa dipakai.",
      TX_FAILED: "Transaksi gagal diproses oleh jaringan.",
      TX_TIMEOUT: "Transaksi terlalu lama dikonfirmasi. Coba refresh status notes.",
      RPC_ERROR: "RPC testnet sedang bermasalah. Coba lagi sebentar.",
    };

    return messages[error.code] || error.message;
  }

  return error?.message || "Terjadi masalah yang tidak diketahui.";
}

function App() {
  const [publicKey, setPublicKey] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contractInstance, setContractInstance] = useState(null);
  const [status, setStatus] = useState("idle");
  const [deletingId, setDeletingId] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const kit = useMemo(() => new StellarContractsKit({ network: NETWORK }), []);
  const isConnected = Boolean(publicKey);

  const loadNotes = useCallback(async (contract = contractInstance) => {
    if (!contract) return;

    try {
      setStatus("loading");
      setError("");
      const { result } = await contract.get_notes.read();
      const formattedNotes = result.map((note) => ({
        ...note,
        id: note.id.toString(),
      }));

      setNotes(formattedNotes);
    } catch (err) {
      console.error("Error loading notes:", err);
      setError(formatContractError(err));
    } finally {
      setStatus("idle");
    }
  }, [contractInstance]);

  useEffect(() => {
    let ignore = false;

    async function loadContract() {
      try {
        setStatus("loading");
        setError("");
        const contract = await kit.contract(CONTRACT_ID);
        if (ignore) return;
        setContractInstance(contract);
        setStatus("loading");
        const { result } = await contract.get_notes.read();
        if (ignore) return;
        setNotes(result.map((note) => ({ ...note, id: note.id.toString() })));
        setStatus("idle");
      } catch (err) {
        if (!ignore) {
          console.error("Error loading contract:", err);
          setError(formatContractError(err));
          setStatus("idle");
        }
      }
    }

    loadContract();

    return () => {
      ignore = true;
    };
  }, [kit]);

  const connectWallet = async () => {
    try {
      setStatus("connecting");
      setError("");
      setNotice("");
      const { address } = await kit.connect();
      setPublicKey(address);
      const contract = contractInstance || await kit.contract(CONTRACT_ID);
      setContractInstance(contract);
      await loadNotes(contract);
      setNotice("Wallet terhubung ke Stellar testnet.");
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError(formatContractError(err));
    } finally {
      setStatus("idle");
    }
  };

  const createNote = async (event) => {
    event.preventDefault();
    setFormError("");
    setError("");
    setNotice("");

    if (!title.trim() || !content.trim()) {
      setFormError("Judul dan isi note wajib diisi.");
      return;
    }

    if (!isConnected || !contractInstance) {
      setFormError("Hubungkan wallet sebelum menyimpan note.");
      return;
    }

    try {
      setStatus("creating");
      const { txHash } = await contractInstance.create_note.invoke(title.trim(), content.trim());
      setTitle("");
      setContent("");
      setNotice(`Note tersimpan. Tx: ${truncateAddress(txHash, 8)}`);
      await loadNotes();
    } catch (err) {
      console.error("Error creating note:", err);
      setError(formatContractError(err));
    } finally {
      setStatus("idle");
    }
  };

  const deleteNote = async (id) => {
    if (!isConnected || !contractInstance) {
      setError("Hubungkan wallet sebelum menghapus note.");
      return;
    }

    try {
      setStatus("deleting");
      setDeletingId(id);
      setError("");
      setNotice("");
      const { txHash } = await contractInstance.delete_note.invoke(BigInt(id));
      setNotice(`Note dihapus. Tx: ${truncateAddress(txHash, 8)}`);
      await loadNotes();
    } catch (err) {
      console.error("Error deleting note:", err);
      setError(formatContractError(err));
    } finally {
      setDeletingId("");
      setStatus("idle");
    }
  };

  const disconnectWallet = async () => {
    await kit.disconnect();
    setPublicKey("");
    setCopiedAddress(false);
    setNotice("Wallet diputus.");
  };

  const copyAddress = async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey);
    setCopiedAddress(true);
    window.setTimeout(() => setCopiedAddress(false), 1600);
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="header-copy">
            <p className="badge">Stellar testnet</p>
            <h1>Web3 Notes</h1>
            <p>Catatan tersimpan di smart contract Soroban dan bisa dibaca dari jaringan testnet.</p>
          </div>

          <div className="wallet-panel" aria-live="polite">
            {isConnected ? (
              <>
                <button className="wallet-btn connected" type="button" onClick={copyAddress}>
                  <span className="status-dot" aria-hidden="true" />
                  <span>{truncateAddress(publicKey)}</span>
                </button>
                <a
                  className="secondary-link"
                  href={`https://stellar.expert/explorer/${NETWORK}/account/${publicKey}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Explorer
                </a>
                <button className="ghost-btn" type="button" onClick={disconnectWallet}>
                  Disconnect
                </button>
              </>
            ) : (
              <button
                className="wallet-btn"
                type="button"
                onClick={connectWallet}
                disabled={status === "connecting"}
                aria-busy={status === "connecting"}
              >
                {status === "connecting" ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </header>

        <main className="layout">
          <section className="panel composer" aria-labelledby="create-note-title">
            <div className="section-heading">
              <p className="eyebrow">Write</p>
              <h2 id="create-note-title">Buat note baru</h2>
            </div>

            <form onSubmit={createNote} className="form" noValidate>
              <div className="field">
                <label htmlFor="note-title">Judul</label>
                <input
                  id="note-title"
                  type="text"
                  placeholder="Roadmap minggu ini"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={status === "creating"}
                  aria-invalid={formError ? "true" : undefined}
                  aria-describedby={formError ? "note-form-error" : "note-title-help"}
                  autoComplete="off"
                />
                <p id="note-title-help" className="hint">Gunakan judul pendek agar mudah discan.</p>
              </div>

              <div className="field">
                <label htmlFor="note-content">Isi note</label>
                <textarea
                  id="note-content"
                  placeholder="Tulis detail note yang akan disimpan ke contract..."
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  disabled={status === "creating"}
                  aria-invalid={formError ? "true" : undefined}
                  aria-describedby={formError ? "note-form-error" : "note-content-help"}
                />
                <p id="note-content-help" className="hint">Transaksi akan meminta tanda tangan wallet.</p>
              </div>

              {formError && (
                <p id="note-form-error" className="inline-error" role="alert">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                className="primary-btn"
                disabled={!isConnected || !contractInstance || status === "creating"}
                aria-busy={status === "creating"}
              >
                {status === "creating" ? "Saving..." : "Save note"}
              </button>
            </form>
          </section>

          <section className="panel contract-card" aria-labelledby="contract-title">
            <div className="section-heading">
              <p className="eyebrow">Contract</p>
              <h2 id="contract-title">Notes contract</h2>
            </div>
            <dl className="meta-list">
              <div>
                <dt>Network</dt>
                <dd>{NETWORK}</dd>
              </div>
              <div>
                <dt>Contract ID</dt>
                <dd>{truncateAddress(CONTRACT_ID, 7)}</dd>
              </div>
              <div>
                <dt>Total notes</dt>
                <dd>{notes.length}</dd>
              </div>
            </dl>
            <a
              className="secondary-link contract-link"
              href={`https://stellar.expert/explorer/${NETWORK}/contract/${CONTRACT_ID}`}
              target="_blank"
              rel="noreferrer"
            >
              View contract
            </a>
          </section>
        </main>

        {(error || notice || copiedAddress) && (
          <div className={`notice ${error ? "error" : "success"}`} role={error ? "alert" : "status"}>
            {error || (copiedAddress ? "Address copied." : notice)}
          </div>
        )}

        <section className="panel notes-section" aria-labelledby="notes-title">
          <div className="notes-header">
            <div className="section-heading">
              <p className="eyebrow">Read</p>
              <h2 id="notes-title">On-chain notes</h2>
            </div>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => loadNotes()}
              disabled={!contractInstance || status === "loading"}
              aria-busy={status === "loading"}
            >
              {status === "loading" ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {status === "loading" && notes.length === 0 ? (
            <div className="skeleton-grid" aria-label="Loading notes">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          ) : notes.length === 0 ? (
            <div className="empty-state">
              <h3>Belum ada notes</h3>
              <p>Connect wallet, tulis note pertama, lalu simpan ke smart contract.</p>
            </div>
          ) : (
            <div className="notes-grid">
              {notes.map((note) => (
                <article className="note-card" key={note.id}>
                  <div>
                    <p className="note-id">ID {note.id}</p>
                    <h3>{note.title}</h3>
                    <p>{note.content}</p>
                  </div>
                  <button
                    className="delete-btn"
                    type="button"
                    onClick={() => deleteNote(note.id)}
                    disabled={!isConnected || deletingId === note.id || status === "deleting"}
                    aria-busy={deletingId === note.id}
                  >
                    {deletingId === note.id ? "Deleting..." : "Delete"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
