"use client"

import { useState, useEffect, useRef } from "react"

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
  const [balance, setBalance] = useState<string>("-")
  const [transferTarget, setTransferTarget] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [transferStatus, setTransferStatus] = useState("")
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [buyStatus, setBuyStatus] = useState("")
  const [liveTransfers, setLiveTransfers] = useState<string[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const clientRef = useRef<any>(null)

  // Demo data
  const demoProducts = [
    { id: "P001", name: "Laptop Gaming", stock: 5 },
    { id: "P002", name: "Mouse Wireless", stock: 15 },
    { id: "P003", name: "Keyboard Mechanical", stock: 8 },
    { id: "P004", name: "Monitor 24 inch", stock: 3 },
    { id: "P005", name: "Headset Gaming", stock: 12 },
  ]

  const demoHistory = [
    { date: "2024-01-15", amount: "Rp 50,000", type: "Transfer Masuk" },
    { date: "2024-01-14", amount: "Rp 25,000", type: "Pembelian" },
    { date: "2024-01-13", amount: "Rp 100,000", type: "Top Up" },
  ]

  // Enable Demo Mode
  const enableDemoMode = () => {
    setIsDemoMode(true)
    setIsConnected(true)
    setBalance("150000")
    setTransferStatus("✅ Demo Mode Aktif - Simulasi koneksi berhasil")
    setProducts(demoProducts)
    setHistory(demoHistory)
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
      // Disconnect previous connection if exists
      if (clientRef.current) {
        clientRef.current.end()
      }

      // Import MQTT dynamically for client-side only
      const mqtt = await import("mqtt")

      // Try multiple connection options
      const connectionOptions = [
        {
          url: "ws://147.182.226.225:9001",
          name: "Primary Server",
        },
        {
          url: "wss://147.182.226.225:9001",
          name: "Primary Server (Secure)",
        },
      ]

      let connected = false
      let lastError = ""

      for (const option of connectionOptions) {
        if (connected) break

        setTransferStatus(`🔄 Mencoba ${option.name}: ${option.url}`)

        try {
          const newClient = mqtt.connect(option.url, {
            username: username,
            password: password,
            connectTimeout: 10000, // 10 seconds
            reconnectPeriod: 0, // Disable auto reconnect for testing
            clean: true,
            keepalive: 60,
            clientId: `bankit_${selectedWallet}_${Date.now()}`,
          })

          // Wait for connection or error
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Connection timeout"))
            }, 10000)

            newClient.on("connect", () => {
              clearTimeout(timeout)
              setIsConnected(true)
              setIsDemoMode(false)
              setTransferStatus(`✅ Berhasil terhubung ke ${selectedWallet} via ${option.name}`)

              // Subscribe to relevant topics
              newClient.subscribe(`${kelas}/${kelompok}/wallet/live-update`)
              newClient.subscribe(`${kelas}/${kelompok}/wallet/transfer-received`)

              setIsLoading(false)
              connected = true
              resolve(true)
            })

            newClient.on("error", (error) => {
              clearTimeout(timeout)
              lastError = error.message
              reject(error)
            })
          })

          newClient.on("message", (topic: string, message: Buffer) => {
            const msg = message.toString()
            console.log(`Received message on ${topic}:`, msg)

            if (topic.endsWith("transfer-received")) {
              setLiveTransfers((prev) => [...prev, `💰 Transfer Masuk: ${msg}`])
            }

            if (topic.endsWith("wallet/live-update")) {
              setBalance(msg)
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
        throw new Error(`Koneksi gagal. Coba Demo Mode untuk testing. Error: ${lastError}`)
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
    setBalance("-")
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

  // Transfer function
  const transfer = () => {
    if ((!client && !isDemoMode) || !transferTarget || !transferAmount) {
      setTransferStatus("❌ Lengkapi data transfer!")
      return
    }

    if (isDemoMode) {
      // Demo mode simulation
      const newBalance = Number.parseInt(balance) - Number.parseInt(transferAmount)
      setBalance(newBalance.toString())
      setTransferStatus(`✅ [DEMO] Transfer Rp ${transferAmount} ke ${transferTarget} berhasil!`)
      setTransferTarget("")
      setTransferAmount("")
      return
    }

    const payload = {
      from_wallet: selectedWallet,
      to_wallet: transferTarget,
      amount: Number.parseFloat(transferAmount),
    }

    client.publish(`${kelas}/${kelompok}/wallet/transfer-request`, JSON.stringify(payload))
    setTransferStatus("✅ Transfer berhasil dikirim!")
    setTransferTarget("")
    setTransferAmount("")
  }

  // Get history
  const getHistory = () => {
    if (isDemoMode) {
      setHistory(demoHistory)
      return
    }
    if (!client) return
    client.publish(`${kelas}/${kelompok}/wallet/history-request`, "")
    client.subscribe(`${kelas}/${kelompok}/wallet/history-response`)
  }

  // Get catalogue
  const getCatalogue = () => {
    if (isDemoMode) {
      setProducts(demoProducts)
      return
    }
    if (!client) return
    client.publish(`${kelas}/${kelompok}/shopit/product/catalogue/request`, "")
    client.subscribe(`${kelas}/${kelompok}/shopit/product/catalogue/response`)
  }

  // Buy product
  const buyProduct = () => {
    if ((!client && !isDemoMode) || !productId || !quantity) {
      setBuyStatus("❌ Lengkapi data pembelian!")
      return
    }

    if (isDemoMode) {
      // Demo mode simulation
      const product = products.find((p) => p.id === productId)
      if (product) {
        setBuyStatus(`✅ [DEMO] Berhasil membeli ${quantity}x ${product.name}!`)
        // Simulate balance deduction
        const newBalance = Number.parseInt(balance) - Number.parseInt(quantity) * 50000 // Assume 50k per item
        setBalance(Math.max(0, newBalance).toString())
      } else {
        setBuyStatus("❌ Product ID tidak ditemukan!")
      }
      setProductId("")
      setQuantity("")
      return
    }

    const payload = {
      wallet: selectedWallet,
      product_id: productId,
      quantity: Number.parseInt(quantity),
    }

    client.publish(`${kelas}/${kelompok}/shopit/product/transaction/request`, JSON.stringify(payload))
    setBuyStatus("✅ Request pembelian berhasil dikirim!")
    setProductId("")
    setQuantity("")
  }

  // Simulate incoming transfer in demo mode
  const simulateIncomingTransfer = () => {
    if (isDemoMode) {
      const amount = Math.floor(Math.random() * 100000) + 10000
      setLiveTransfers((prev) => [...prev, `💰 [DEMO] Transfer Masuk: Rp ${amount} dari Kelompok_B_Kelas_B`])
      setBalance((prev) => (Number.parseInt(prev) + amount).toString())
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.end()
      }
    }
  }, [])

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

        {/* Demo Instructions */}
        <div className="alert-info">
          <div className="flex items-start space-x-2">
            <div className="text-blue-600 text-lg">ℹ️</div>
            <div>
              <p className="font-medium text-blue-800">Demo Instructions:</p>
              <p className="text-blue-700 text-sm">
                Jika koneksi MQTT gagal, gunakan <strong>Demo Mode</strong> untuk testing UI. Pilih E-Wallet yang
                berbeda untuk testing interaksi antar anggota kelompok.
              </p>
            </div>
          </div>
        </div>

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
                  {isLoading ? "Connecting..." : isConnected ? "Connected" : "Connect"}
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
              <div className="text-3xl font-bold text-green-600">{balance === "-" ? "Rp -" : `Rp ${balance}`}</div>
              <div className="flex justify-center gap-2">
                <span className={isConnected ? "badge-success" : "badge-error"}>
                  {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
                </span>
                {isDemoMode && <span className="badge-gray">🎭 Demo Mode</span>}
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
              <button onClick={transfer} disabled={!isConnected} className="w-full btn-success disabled:opacity-50">
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
                  {liveTransfers.map((transfer, index) => (
                    <div key={index} className="text-sm p-2 bg-green-50 rounded border-l-4 border-green-400">
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
            <p className="text-gray-600 text-sm mb-4">Riwayat transaksi E-Wallet</p>
            <button
              onClick={getHistory}
              disabled={!isConnected}
              className="w-full btn-purple disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {isConnected ? "Get History" : "Hubungkan E-Wallet Dulu"}
            </button>
            <div className="h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
              {history.length === 0 ? (
                <p className="text-gray-500 text-sm">Belum ada riwayat transaksi</p>
              ) : (
                <div className="space-y-2">
                  {history.map((entry, index) => (
                    <div key={index} className="text-sm p-2 border border-gray-200 rounded bg-white">
                      <div className="font-medium">{entry.date}</div>
                      <div className="text-gray-600">
                        {entry.amount} ({entry.type})
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
              <input
                type="text"
                placeholder="Product ID (contoh: P001)"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                disabled={!isConnected}
                className="input-field"
              />
              <input
                type="number"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={!isConnected}
                className="input-field"
              />
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

        {/* Product Catalogue */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="mr-2">🛍️</span>
            ShopIT Product Catalogue
          </h2>
          <p className="text-gray-600 text-sm mb-4">Katalog produk ShopIT</p>
          <button
            onClick={getCatalogue}
            disabled={!isConnected}
            className="btn-indigo disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {isConnected ? "Lihat Katalog Produk" : "Hubungkan E-Wallet Dulu"}
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 space-y-2 hover:shadow-md transition-shadow bg-gray-50"
              >
                <div className="font-medium text-blue-600">ID: {product.id}</div>
                <div className="text-gray-800 font-semibold">{product.name}</div>
                <span
                  className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                    product.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  Stok: {product.stock}
                </span>
              </div>
            ))}
          </div>
          {products.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">
              Belum ada produk yang dimuat. Klik "Lihat Katalog Produk" untuk memuat katalog.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
