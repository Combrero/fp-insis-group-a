"use client"

import { useState, useEffect, useRef } from "react"

interface Product {
  id: string
  name: string
  price: number
  stock: number
  category: string
}

interface HistoryEntry {
  id: string
  date: string
  amount: number
  type: "Transfer Masuk" | "Transfer Keluar" | "Pembelian" | "Top Up"
  description: string
  from?: string
  to?: string
}

interface PurchaseItem {
  product: Product
  quantity: number
  subtotal: number
}

export default function BankITShopIT() {
  // Kredensial Kelompok A Kelas B
  const username = "Kelompok_A_Kelas_B"
  const password = "Insys#BA#008"
  const kelas = "B"
  const kelompok = "A"

  // State management
  const [client, setClient] = useState<any>(null)
  const [selectedWallet, setSelectedWallet] = useState<string>("")
  const [isConnected, setIsConnected] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [balance, setBalance] = useState<number>(0)
  const [transferTarget, setTransferTarget] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [transferStatus, setTransferStatus] = useState("")
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [buyStatus, setBuyStatus] = useState("")
  const [liveTransfers, setLiveTransfers] = useState<string[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [historyDateFrom, setHistoryDateFrom] = useState("")
  const [historyDateTo, setHistoryDateTo] = useState("")
  const [showInvoice, setShowInvoice] = useState(false)
  const [lastPurchase, setLastPurchase] = useState<PurchaseItem[]>([])
  const [showTransferConfirm, setShowTransferConfirm] = useState(false)

  const clientRef = useRef<any>(null)

  // Demo data dengan harga
  const demoProducts: Product[] = [
    { id: "P001", name: "Laptop Gaming", price: 15000000, stock: 5, category: "Electronics" },
    { id: "P002", name: "Mouse Wireless", price: 250000, stock: 15, category: "Accessories" },
    { id: "P003", name: "Keyboard Mechanical", price: 750000, stock: 8, category: "Accessories" },
    { id: "P004", name: "Monitor 24 inch", price: 3500000, stock: 3, category: "Electronics" },
    { id: "P005", name: "Headset Gaming", price: 850000, stock: 12, category: "Accessories" },
    { id: "P006", name: "Webcam HD", price: 450000, stock: 7, category: "Accessories" },
    { id: "P007", name: "SSD 1TB", price: 1200000, stock: 10, category: "Storage" },
    { id: "P008", name: "RAM 16GB", price: 900000, stock: 6, category: "Components" },
  ]

  const generateDemoHistory = (): HistoryEntry[] => {
    const entries: HistoryEntry[] = []
    const now = new Date()

    // Generate 20 random history entries over the last 6 months
    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 180) // 6 months
      const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      const types: HistoryEntry["type"][] = ["Transfer Masuk", "Transfer Keluar", "Pembelian", "Top Up"]
      const type = types[Math.floor(Math.random() * types.length)]

      let amount = 0
      let description = ""

      switch (type) {
        case "Transfer Masuk":
          amount = Math.floor(Math.random() * 500000) + 50000
          description = `Transfer dari Kelompok_${String.fromCharCode(66 + Math.floor(Math.random() * 5))}_Kelas_B`
          break
        case "Transfer Keluar":
          amount = -(Math.floor(Math.random() * 300000) + 25000)
          description = `Transfer ke Kelompok_${String.fromCharCode(66 + Math.floor(Math.random() * 5))}_Kelas_B`
          break
        case "Pembelian":
          amount = -(Math.floor(Math.random() * 2000000) + 100000)
          description = `Pembelian ${demoProducts[Math.floor(Math.random() * demoProducts.length)].name}`
          break
        case "Top Up":
          amount = Math.floor(Math.random() * 1000000) + 100000
          description = "Top Up Saldo"
          break
      }

      entries.push({
        id: `hist_${i}`,
        date: date.toISOString().split("T")[0],
        amount,
        type,
        description,
      })
    }

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // Initialize demo data
  useEffect(() => {
    if (isDemoMode) {
      setProducts(demoProducts)
      setHistory(generateDemoHistory())
    }
  }, [isDemoMode])

  // Set default date range (last 30 days)
  useEffect(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    setHistoryDateTo(now.toISOString().split("T")[0])
    setHistoryDateFrom(thirtyDaysAgo.toISOString().split("T")[0])
  }, [])

  // Enable Demo Mode
  const enableDemoMode = () => {
    setIsDemoMode(true)
    setIsConnected(true)
    setBalance(2500000) // 2.5 juta
    setTransferStatus("✅ Demo Mode Aktif - Simulasi koneksi berhasil")
    setProducts(demoProducts)
    setHistory(generateDemoHistory())

    // Simulate some live transfers
    setTimeout(() => {
      setLiveTransfers((prev) => [...prev, "💰 Transfer Masuk: Rp 150,000 dari Kelompok_C_Kelas_B"])
      setBalance((prev) => prev + 150000)
    }, 2000)

    setTimeout(() => {
      setLiveTransfers((prev) => [...prev, "💰 Transfer Masuk: Rp 75,000 dari Kelompok_D_Kelas_B"])
      setBalance((prev) => prev + 75000)
    }, 5000)
  }

  // Connect to MQTT when wallet is selected
  const connectToWallet = async () => {
    if (!selectedWallet) {
      setTransferStatus("Pilih E-Wallet terlebih dahulu!")
      return
    }

    setIsLoading(true)
    setTransferStatus("🔄 Mencoba terhubung ke MQTT broker...")

    try {
      if (clientRef.current) {
        clientRef.current.end()
      }

      const { connect } = await import("mqtt")

      const connectionOptions = [
        { url: "ws://147.182.226.225:9001", name: "Primary Server" },
        { url: "wss://147.182.226.225:9001", name: "Primary Server (Secure)" },
      ]

      let connected = false
      let lastError = ""

      for (const option of connectionOptions) {
        if (connected) break

        setTransferStatus(`🔄 Mencoba ${option.name}: ${option.url}`)

        try {
          const newClient = connect(option.url, {
            username: username,
            password: password,
            connectTimeout: 10000,
            reconnectPeriod: 5000, // Auto reconnect every 5 seconds
            clean: true,
            keepalive: 60,
            clientId: `bankit_${selectedWallet}_${Date.now()}`,
          })

          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Connection timeout"))
            }, 10000)

            newClient.on("connect", () => {
              clearTimeout(timeout)
              setIsConnected(true)
              setIsDemoMode(false)
              setTransferStatus(`✅ Berhasil terhubung ke ${selectedWallet} via ${option.name}`)

              // Subscribe to all relevant topics
              newClient.subscribe(`${kelas}/${kelompok}/wallet/live-update`)
              newClient.subscribe(`${kelas}/${kelompok}/wallet/transfer-received`)
              newClient.subscribe(`${kelas}/${kelompok}/wallet/balance-response`)
              newClient.subscribe(`${kelas}/${kelompok}/wallet/history-response`)
              newClient.subscribe(`${kelas}/${kelompok}/shopit/product/catalogue/response`)
              newClient.subscribe(`${kelas}/${kelompok}/shopit/product/transaction/response`)

              // Request initial data
              newClient.publish(`${kelas}/${kelompok}/wallet/balance-request`, selectedWallet)
              newClient.publish(`${kelas}/${kelompok}/shopit/product/catalogue/request`, "")

              setIsLoading(false)
              connected = true
              resolve(true)
            })

            newClient.on("error", (error) => {
              clearTimeout(timeout)
              lastError = error.message
              reject(error)
            })

            newClient.on("reconnect", () => {
              setTransferStatus("🔄 Reconnecting to MQTT broker...")
            })

            newClient.on("offline", () => {
              setTransferStatus("⚠️ Connection lost, attempting to reconnect...")
            })
          })

          newClient.on("message", (topic: string, message: Buffer) => {
            const msg = message.toString()
            console.log(`Received message on ${topic}:`, msg)

            if (topic.endsWith("transfer-received")) {
              const transferData = JSON.parse(msg)
              setLiveTransfers((prev) => [
                ...prev,
                `💰 Transfer Masuk: Rp ${transferData.amount.toLocaleString()} dari ${transferData.from}`,
              ])
              setBalance((prev) => prev + transferData.amount)
            }

            if (topic.endsWith("balance-response")) {
              setBalance(Number.parseInt(msg))
            }

            if (topic.endsWith("wallet/live-update")) {
              setBalance(Number.parseInt(msg))
            }

            if (topic.endsWith("wallet/history-response")) {
              try {
                const historyData = JSON.parse(msg)
                setHistory(historyData)
              } catch (e) {
                console.error("Error parsing history:", e)
              }
            }

            if (topic.endsWith("catalogue/response")) {
              try {
                const productsData = JSON.parse(msg)
                setProducts(productsData)
              } catch (e) {
                console.error("Error parsing products:", e)
              }
            }

            if (topic.endsWith("transaction/response")) {
              try {
                const transactionData = JSON.parse(msg)
                setBuyStatus(`✅ Transaksi berhasil! Invoice: ${transactionData.invoice_id}`)
              } catch (e) {
                console.error("Error parsing transaction:", e)
              }
            }
          })

          clientRef.current = newClient
          setClient(newClient)
          break
        } catch (error: any) {
          console.error(`Failed to connect via ${option.name}:`, error.message)
          lastError = error.message
          continue
        }
      }

      if (!connected) {
        throw new Error(`Koneksi gagal. Server mungkin tidak aktif. Error: ${lastError}`)
      }
    } catch (error: any) {
      setIsLoading(false)
      setIsConnected(false)
      setTransferStatus(`❌ Gagal terhubung: ${error.message}`)
      console.error("MQTT Connection Error:", error)
    }
  }

  // Disconnect from current wallet
  const disconnectWallet = () => {
    if (clientRef.current) {
      clientRef.current.end()
    }
    setClient(null)
    setIsConnected(false)
    setIsDemoMode(false)
    setBalance(0)
    setTransferStatus("")
    setLiveTransfers([])
    setHistory([])
    setProducts([])
  }

  // Auto connect when wallet changes
  useEffect(() => {
    if (selectedWallet && !isConnected && !isDemoMode) {
      connectToWallet()
    }
  }, [selectedWallet])

  // Transfer function with confirmation
  const initiateTransfer = () => {
    if ((!client && !isDemoMode) || !transferTarget || !transferAmount) {
      setTransferStatus("❌ Lengkapi data transfer!")
      return
    }
    setShowTransferConfirm(true)
  }

  const confirmTransfer = () => {
    const amount = Number.parseInt(transferAmount)

    if (amount > balance) {
      setTransferStatus("❌ Saldo tidak mencukupi!")
      setShowTransferConfirm(false)
      return
    }

    if (isDemoMode) {
      setBalance((prev) => prev - amount)
      setTransferStatus(`✅ [DEMO] Transfer Rp ${amount.toLocaleString()} ke ${transferTarget} berhasil!`)

      // Add to history
      const newEntry: HistoryEntry = {
        id: `transfer_${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        amount: -amount,
        type: "Transfer Keluar",
        description: `Transfer ke ${transferTarget}`,
        to: transferTarget,
      }
      setHistory((prev) => [newEntry, ...prev])
    } else {
      const payload = {
        from_wallet: selectedWallet,
        to_wallet: transferTarget,
        amount: amount,
      }
      client.publish(`${kelas}/${kelompok}/wallet/transfer-request`, JSON.stringify(payload))
      setTransferStatus("✅ Transfer berhasil dikirim!")
    }

    setTransferTarget("")
    setTransferAmount("")
    setShowTransferConfirm(false)
  }

  // Get history with date filter
  const getHistory = () => {
    if (!historyDateFrom || !historyDateTo) {
      setTransferStatus("❌ Pilih rentang tanggal!")
      return
    }

    const fromDate = new Date(historyDateFrom)
    const toDate = new Date(historyDateTo)
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays > 30) {
      setTransferStatus("❌ Rentang maksimal 30 hari!")
      return
    }

    if (isDemoMode) {
      const filteredHistory = generateDemoHistory().filter((entry) => {
        const entryDate = new Date(entry.date)
        return entryDate >= fromDate && entryDate <= toDate
      })
      setHistory(filteredHistory)
      setTransferStatus(`✅ History dimuat: ${filteredHistory.length} transaksi`)
    } else {
      if (!client) return
      const payload = {
        from_date: historyDateFrom,
        to_date: historyDateTo,
      }
      client.publish(`${kelas}/${kelompok}/wallet/history-request`, JSON.stringify(payload))
    }
  }

  // Buy product with invoice
  const buyProduct = () => {
    if ((!client && !isDemoMode) || !productId || !quantity) {
      setBuyStatus("❌ Lengkapi data pembelian!")
      return
    }

    const product = products.find((p) => p.id === productId)
    if (!product) {
      setBuyStatus("❌ Product ID tidak ditemukan!")
      return
    }

    const qty = Number.parseInt(quantity)
    const subtotal = product.price * qty

    if (subtotal > balance) {
      setBuyStatus("❌ Saldo tidak mencukupi!")
      return
    }

    if (qty > product.stock) {
      setBuyStatus("❌ Stok tidak mencukupi!")
      return
    }

    const purchaseItems: PurchaseItem[] = [
      {
        product,
        quantity: qty,
        subtotal,
      },
    ]

    if (isDemoMode) {
      setBalance((prev) => prev - subtotal)
      setLastPurchase(purchaseItems)
      setShowInvoice(true)
      setBuyStatus(`✅ [DEMO] Berhasil membeli ${qty}x ${product.name}!`)

      // Update stock
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: p.stock - qty } : p)))

      // Add to history
      const newEntry: HistoryEntry = {
        id: `purchase_${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        amount: -subtotal,
        type: "Pembelian",
        description: `Pembelian ${qty}x ${product.name}`,
      }
      setHistory((prev) => [newEntry, ...prev])
    } else {
      const payload = {
        wallet: selectedWallet,
        product_id: productId,
        quantity: qty,
      }
      client.publish(`${kelas}/${kelompok}/shopit/product/transaction/request`, JSON.stringify(payload))
      setBuyStatus("✅ Request pembelian berhasil dikirim!")
    }

    setProductId("")
    setQuantity("")
  }

  // Simulate incoming transfer in demo mode
  const simulateIncomingTransfer = () => {
    if (isDemoMode) {
      const amount = Math.floor(Math.random() * 200000) + 50000
      const senders = ["Kelompok_B_Kelas_B", "Kelompok_C_Kelas_B", "Kelompok_D_Kelas_B", "Kelompok_E_Kelas_B"]
      const sender = senders[Math.floor(Math.random() * senders.length)]

      setLiveTransfers((prev) => [...prev, `💰 [DEMO] Transfer Masuk: Rp ${amount.toLocaleString()} dari ${sender}`])
      setBalance((prev) => prev + amount)

      // Add to history
      const newEntry: HistoryEntry = {
        id: `incoming_${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        amount: amount,
        type: "Transfer Masuk",
        description: `Transfer dari ${sender}`,
        from: sender,
      }
      setHistory((prev) => [newEntry, ...prev])
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString("id-ID")}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.end()
      }
    }
  }, [])

  // Filter history by date range
  const filteredHistory = history.filter((entry) => {
    if (!historyDateFrom || !historyDateTo) return true
    const entryDate = new Date(entry.date)
    const fromDate = new Date(historyDateFrom)
    const toDate = new Date(historyDateTo)
    return entryDate >= fromDate && entryDate <= toDate
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">BankIT - ShopIT Integration</h1>
          <p className="text-gray-600">Kelompok A Kelas B - Final Project Integrasi Sistem</p>
        </div>

        {/* Demo Mode Alert */}
        {isDemoMode && (
          <div className="alert-success">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-green-600 text-lg">🎭</span>
                <div>
                  <p className="font-medium text-green-800">Demo Mode Aktif</p>
                  <p className="text-green-700 text-sm">Semua transaksi adalah simulasi untuk testing UI</p>
                </div>
              </div>
              <button onClick={simulateIncomingTransfer} className="btn-success text-sm">
                Simulasi Transfer Masuk
              </button>
            </div>
          </div>
        )}

        {/* Connection Status */}
        {/* <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="mr-2">🔗</span>
            Connection Status & Mode
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Mode Saat Ini:</p>
              <div className="flex gap-2">
                {isDemoMode ? (
                  <span className="badge-warning">🎭 Demo Mode</span>
                ) : isConnected ? (
                  <span className="badge-success">🟢 Real Connection</span>
                ) : (
                  <span className="badge-error">🔴 Disconnected</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Perbedaan Mode:</p>
              <div className="text-sm space-y-1">
                <p>
                  <strong>Demo Mode:</strong> Simulasi UI, data palsu untuk testing
                </p>
                <p>
                  <strong>Real Connection:</strong> Koneksi MQTT asli, data real-time
                </p>
              </div>
            </div>
          </div>
        </div> */}

        {/* Demo Instructions */}
        {/* <div className="alert-info">
          <div className="flex items-start space-x-2">
            <div className="text-blue-600 text-lg">ℹ️</div>
            <div>
              <p className="font-medium text-blue-800">Demo Instructions:</p>
              <p className="text-blue-700 text-sm">
                <strong>Demo Mode:</strong> Untuk testing UI tanpa koneksi server. <strong>Real Connection:</strong>{" "}
                Untuk koneksi MQTT asli (perlu server aktif). Pilih E-Wallet yang berbeda untuk testing interaksi antar
                anggota kelompok.
              </p>
            </div>
          </div>
        </div> */}

        {/* User Profile */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="mr-2">👥</span>
            User Profile - Kelompok A Kelas B
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Anggota Kelompok</p>
              <p className="font-medium">Chelsea Vania Hariyono</p>
              <p className="font-medium">Salsabila Rahmah</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">NRP</p>
              <p className="font-medium">5027231003</p>
              <p className="font-medium">5027231005</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Kredensial</p>
              <p className="font-medium">Username: {username}</p>
              <p className="font-medium">
                Kelas: {kelas} | Kelompok: {kelompok}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* E-Wallet Selection */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">💳</span>
              My E-Wallet
            </h2>
            <p className="text-gray-600 text-sm mb-4">Pilih dan hubungkan ke E-Wallet BankIT</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih E-Wallet:</label>
                <select
                  value={selectedWallet}
                  onChange={(e) => {
                    if (isConnected) disconnectWallet()
                    setSelectedWallet(e.target.value)
                  }}
                  className="input-field"
                >
                  <option value="">Pilih E-Wallet BankIT</option>
                  <option value="DoPay">💳 DoPay</option>
                  <option value="OWO">💰 OWO</option>
                  <option value="RiNG Aja">🔔 RiNG Aja</option>
                </select>
              </div>

              {selectedWallet && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">E-Wallet Terpilih:</p>
                  <p className="text-lg font-bold text-blue-600">{selectedWallet}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={connectToWallet}
                  disabled={isLoading || !selectedWallet || isConnected}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Connecting..." : isConnected ? "Connected" : "Real Connect"}
                </button>
                <button
                  onClick={enableDemoMode}
                  disabled={!selectedWallet || isConnected}
                  className="btn-warning disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Demo Mode
                </button>
                {isConnected && (
                  <button onClick={disconnectWallet} className="btn-secondary">
                    Disconnect
                  </button>
                )}
              </div>

              {transferStatus && (
                <div className="alert-warning">
                  <p className="text-sm text-yellow-800">{transferStatus}</p>
                </div>
              )}
            </div>
          </div>

          {/* Live Balance */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">💰</span>
              Live Wallet Balance
            </h2>
            <p className="text-gray-600 text-sm mb-4">Saldo real-time E-Wallet Anda</p>
            <div className="text-center space-y-3">
              <div className="text-3xl font-bold text-green-600">
                {balance === 0 ? "Rp -" : formatCurrency(balance)}
              </div>
              <div className="flex justify-center gap-2">
                <span className={isConnected ? "badge-success" : "badge-error"}>
                  {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
                </span>
                {isDemoMode && <span className="badge-warning">🎭 Demo</span>}
                {selectedWallet && <span className="badge-gray">{selectedWallet}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Transfer Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">📤</span>
              Balance Transfer
            </h2>
            <p className="text-gray-600 text-sm mb-4">Transfer saldo ke E-Wallet lain</p>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Target Wallet Username (contoh: Kelompok_B_Kelas_B)"
                value={transferTarget}
                onChange={(e) => setTransferTarget(e.target.value)}
                disabled={!isConnected}
                className="input-field"
              />
              <input
                type="number"
                placeholder="Jumlah Transfer"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                disabled={!isConnected}
                className="input-field"
              />
              <button
                onClick={initiateTransfer}
                disabled={!isConnected}
                className="w-full btn-success disabled:opacity-50"
              >
                {isConnected ? "Transfer Sekarang" : "Hubungkan E-Wallet Dulu"}
              </button>
            </div>
          </div>

          {/* Live Updates */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">⚡</span>
              Live Transfer Updates
            </h2>
            <p className="text-gray-600 text-sm mb-4">Transfer masuk real-time</p>
            <div className="h-32 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
              {liveTransfers.length === 0 ? (
                <p className="text-gray-500 text-sm">Belum ada transfer masuk</p>
              ) : (
                <div className="space-y-2">
                  {liveTransfers
                    .slice()
                    .reverse()
                    .map((transfer, index) => (
                      <div
                        key={index}
                        className="text-sm p-2 bg-green-50 rounded border-l-4 border-green-400 animate-pulse"
                      >
                        {transfer}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History & Shopping */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">📜</span>
              Wallet History
            </h2>
            <p className="text-gray-600 text-sm mb-4">Riwayat transaksi E-Wallet (maksimal 30 hari)</p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <label className="text-xs text-gray-600">Dari Tanggal:</label>
                <input
                  type="date"
                  value={historyDateFrom}
                  onChange={(e) => setHistoryDateFrom(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Sampai Tanggal:</label>
                <input
                  type="date"
                  value={historyDateTo}
                  onChange={(e) => setHistoryDateTo(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="input-field text-sm"
                />
              </div>
            </div>

            <button
              onClick={getHistory}
              disabled={!isConnected}
              className="w-full btn-purple disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {isConnected ? "Get History" : "Hubungkan E-Wallet Dulu"}
            </button>

            <div className="h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
              {filteredHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">Belum ada riwayat transaksi</p>
              ) : (
                <div className="space-y-2">
                  {filteredHistory.map((entry, index) => (
                    <div key={entry.id} className="text-sm p-3 border border-gray-200 rounded bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{entry.date}</div>
                          <div className="text-gray-600 text-xs">{entry.description}</div>
                        </div>
                        <div className={`font-bold ${entry.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {entry.amount >= 0 ? "+" : ""}
                          {formatCurrency(entry.amount)}
                        </div>
                      </div>
                      <div className="mt-1">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            entry.type === "Transfer Masuk"
                              ? "bg-green-100 text-green-800"
                              : entry.type === "Transfer Keluar"
                                ? "bg-red-100 text-red-800"
                                : entry.type === "Pembelian"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {entry.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">🛒</span>
              Beli Produk ShopIT
            </h2>
            <p className="text-gray-600 text-sm mb-4">Pembelian produk dari ShopIT</p>
            <div className="space-y-4">
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                disabled={!isConnected}
                className="input-field"
              >
                <option value="">Pilih Produk</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.price)} (Stok: {product.stock})
                  </option>
                ))}
              </select>

              {productId && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  {(() => {
                    const product = products.find((p) => p.id === productId)
                    return product ? (
                      <div>
                        <p className="font-medium text-blue-800">{product.name}</p>
                        <p className="text-blue-600">Harga: {formatCurrency(product.price)}</p>
                        <p className="text-blue-600 text-sm">Stok tersedia: {product.stock}</p>
                      </div>
                    ) : null
                  })()}
                </div>
              )}

              <input
                type="number"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={!isConnected}
                min="1"
                className="input-field"
              />

              {productId && quantity && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  {(() => {
                    const product = products.find((p) => p.id === productId)
                    const qty = Number.parseInt(quantity)
                    return product && qty > 0 ? (
                      <div>
                        <p className="font-medium text-green-800">Preview Pembelian:</p>
                        <p className="text-green-600">
                          {qty}x {product.name}
                        </p>
                        <p className="text-green-600 font-bold">Total: {formatCurrency(product.price * qty)}</p>
                      </div>
                    ) : null
                  })()}
                </div>
              )}

              <button
                onClick={buyProduct}
                disabled={!isConnected}
                className="w-full btn-warning disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnected ? "Beli Produk" : "Hubungkan E-Wallet Dulu"}
              </button>
              {buyStatus && (
                <div className="alert-warning">
                  <p className="text-sm text-yellow-800">{buyStatus}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Catalogue - Auto loaded */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="mr-2">🛍️</span>
            ShopIT Product Catalogue
          </h2>
          <p className="text-gray-600 text-sm mb-4">Katalog produk ShopIT</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((product, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 space-y-2 hover:shadow-md transition-shadow bg-gray-50"
              >
                <div className="font-medium text-blue-600">ID: {product.id}</div>
                <div className="text-gray-800 font-semibold">{product.name}</div>
                <div className="text-green-600 font-bold">{formatCurrency(product.price)}</div>
                <span
                  className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                    product.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  Stok: {product.stock}
                </span>
                <div className="text-xs text-gray-500">{product.category}</div>
              </div>
            ))}
          </div>
          {products.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">
              Produk akan dimuat otomatis setelah terhubung ke server.
            </p>
          )}
        </div>

        {/* Transfer Confirmation Modal */}
        {showTransferConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold mb-4">Konfirmasi Transfer</h3>
              <div className="space-y-2 mb-4">
                <p>
                  <strong>Dari:</strong> {selectedWallet}
                </p>
                <p>
                  <strong>Ke:</strong> {transferTarget}
                </p>
                <p>
                  <strong>Jumlah:</strong> {formatCurrency(Number.parseInt(transferAmount))}
                </p>
                <p>
                  <strong>Saldo setelah transfer:</strong> {formatCurrency(balance - Number.parseInt(transferAmount))}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={confirmTransfer} className="flex-1 btn-success">
                  Konfirmasi Transfer
                </button>
                <button onClick={() => setShowTransferConfirm(false)} className="flex-1 btn-secondary">
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Modal */}
        {showInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold mb-4">🧾 Invoice Pembelian</h3>
              <div className="space-y-3 mb-4">
                <div className="border-b pb-2">
                  <p className="text-sm text-gray-600">Invoice ID: INV-{Date.now()}</p>
                  <p className="text-sm text-gray-600">Tanggal: {new Date().toLocaleDateString("id-ID")}</p>
                  <p className="text-sm text-gray-600">E-Wallet: {selectedWallet}</p>
                </div>
                {lastPurchase.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity}x {formatCurrency(item.product.price)}
                      </p>
                    </div>
                    <p className="font-bold">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(lastPurchase.reduce((sum, item) => sum + item.subtotal, 0))}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowInvoice(false)} className="w-full btn-primary">
                Tutup Invoice
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
