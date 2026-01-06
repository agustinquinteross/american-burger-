import { useState } from 'react'
import { useCart } from '../store/useCart'
import { supabase } from '../lib/supabase'
import { X, Loader2, MapPin, Store, Search, Trash2, Ticket } from 'lucide-react'
import dynamic from 'next/dynamic'

// Carga dinámica del mapa para que no falle
const MapPicker = dynamic(() => import('./MapPicker'), { 
  ssr: false,
  loading: () => <div className="h-48 bg-gray-800 animate-pulse rounded-xl flex items-center justify-center text-gray-500">Cargando mapa...</div>
})

export default function CartModal({ isOpen, onClose }) {
  const { cart, getTotal, clearCart, removeFromCart } = useCart()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [couponMsg, setCouponMsg] = useState('')
  
  const [deliveryType, setDeliveryType] = useState('delivery')
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState(null)
  
  // Mapa y Búsqueda
  const [forcedCoords, setForcedCoords] = useState(null)
  const [searchingMap, setSearchingMap] = useState(false)

  if (!isOpen) return null

  const subtotal = getTotal()
  const deliveryCost = deliveryType === 'delivery' ? 1500 : 0 
  const total = Math.max(0, subtotal - discount + deliveryCost)

  // --- BUSCADOR DE DIRECCIÓN ---
  const handleSearchAddress = async () => {
    if (!address) return
    setSearchingMap(true)
    try {
      const query = `${address}, San Fernando del Valle de Catamarca, Argentina`
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data && data.length > 0) {
        const { lat, lon } = data[0]
        const newCoords = { lat: parseFloat(lat), lng: parseFloat(lon) }
        setForcedCoords(newCoords)
        setCoords(newCoords)
      } else {
        alert('No encontramos esa dirección. Intenta mover el pin manualmente en el mapa.')
      }
    } catch (error) {
      console.error(error)
      alert('Error buscando dirección')
    }
    setSearchingMap(false)
  }

  // --- CUPONES ---
  const handleApplyCoupon = async () => {
    if (!couponCode) return
    setLoading(true)
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .single()
    setLoading(false)

    if (error || !data) {
      setCouponMsg('❌ Cupón inválido')
      setDiscount(0)
      return
    }
    let discountValue = data.discount_type === 'percent' ? (subtotal * data.value) / 100 : data.value
    setDiscount(discountValue)
    setCouponMsg(`✅ Descuento aplicado: -$${discountValue}`)
  }

  // --- ENVIAR PEDIDO ---
  const handleCheckout = async () => {
    if (!name || !phone) return alert('Por favor completa Nombre y Teléfono')
    if (deliveryType === 'delivery' && !address) return alert('Por favor escribe tu dirección')
    
    setLoading(true)

    const { data: order, error } = await supabase.from('orders').insert({
        customer_name: name,
        customer_phone: phone,
        customer_address: deliveryType === 'delivery' ? address : 'Retiro en Local',
        total: total,
        status: 'pending',
      }).select().single()

    if (error) {
      alert('Error al crear pedido')
      setLoading(false)
      return
    }

    // Guardar items
    const orderItems = cart.map(item => ({
      order_id: order.id,
      product_name: item.name,
      quantity: item.quantity,
      price: item.price,
      // Guardamos los extras en texto plano para que sea fácil de leer
      options: item.selectedOptions ? item.selectedOptions.map(o => o.name).join(', ') : ''
    }))
    await supabase.from('order_items').insert(orderItems)

    // Mensaje WhatsApp
    const itemsList = cart.map(i => {
        let text = `▪️ ${i.quantity}x ${i.name}`
        if(i.selectedOptions && i.selectedOptions.length > 0) {
            text += ` (${i.selectedOptions.map(o => o.name).join(', ')})`
        }
        return text
    }).join('%0A')

    const finalCoords = coords || forcedCoords
    // Antes estaba mal, cámbialo por esto:
const mapLink = finalCoords ? `https://www.google.com/maps?q=${finalCoords.lat},${finalCoords.lng}` : ''
    
    let message = `Hola American Burger! 🍔%0A%0ASoy *${name}*.%0APedido *%23${order.id}* (%0A`
    message += deliveryType === 'delivery' ? `🛵 *ENVÍO A DOMICILIO*` : `🏪 *RETIRO EN LOCAL*`
    message += `)%0A%0A${itemsList}%0A%0A`
    
    if (deliveryType === 'delivery') {
      message += `📍 *Dirección:* ${address}%0A`
      if (mapLink) message += `🗺️ *Ubicación GPS:* ${mapLink}%0A`
    }
    
    message += `%0A*Total a pagar: $${total}*`

    window.open(`https://wa.me/5493834968345?text=${message}`, '_blank')
    clearCart()
    onClose()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-gray-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-800 text-gray-200">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-white italic tracking-tighter">TU PEDIDO <span className="text-red-600">AMERICAN</span></h2>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* ITEMS DEL CARRITO */}
        <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {cart.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Tu carrito está vacío 😔</p>
          ) : (
            cart.map((item) => (
              <div key={item.cartItemId} className="flex justify-between items-start bg-black/40 p-3 rounded-xl border border-gray-800">
                <div className="flex gap-3">
                   <div className="text-red-500 font-bold mt-1">{item.quantity}x</div>
                   <div>
                      <p className="font-bold text-white leading-tight">{item.name}</p>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                              {item.selectedOptions.map(o => o.name).join(', ')}
                          </p>
                      )}
                      <p className="text-yellow-500 font-bold text-sm mt-1">${item.price * item.quantity}</p>
                   </div>
                </div>
                <button onClick={() => removeFromCart(item.cartItemId)} className="text-gray-600 hover:text-red-500 p-1">
                   <Trash2 size={16}/>
                </button>
              </div>
            ))
          )}
        </div>

        {/* TIPO DE ENTREGA */}
        <div className="flex gap-2 mb-6 bg-black p-1 rounded-xl border border-gray-800">
          <button onClick={() => setDeliveryType('delivery')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${deliveryType === 'delivery' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-500 hover:text-gray-300'}`}>
            <MapPin size={16} /> ENVÍO
          </button>
          <button onClick={() => setDeliveryType('pickup')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${deliveryType === 'pickup' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-500 hover:text-gray-300'}`}>
            <Store size={16} /> RETIRO
          </button>
        </div>

        {/* DIRECCIÓN Y MAPA */}
        {deliveryType === 'delivery' && (
          <div className="space-y-3 mb-6 animate-in slide-in-from-top-2">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Dirección de Entrega</label>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Calle y Número (Ej: República 500)" 
                className="flex-1 p-3 bg-black border border-gray-700 rounded-xl font-medium outline-none text-white focus:border-red-600 transition"
                value={address}
                onChange={e => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
              />
              <button 
                onClick={handleSearchAddress}
                className="bg-gray-800 text-white p-3 rounded-xl flex items-center justify-center hover:bg-gray-700 border border-gray-700"
              >
                {searchingMap ? <Loader2 className="animate-spin" size={20}/> : <Search size={20} />}
              </button>
            </div>
            
            <div className="rounded-xl overflow-hidden border border-gray-800">
                <MapPicker setLocation={setCoords} forcedCoords={forcedCoords} />
            </div>
            <p className="text-[10px] text-gray-500 text-center">Mueve el pin 📍 si la ubicación no es exacta.</p>
          </div>
        )}

        {/* CUPÓN Y TOTALES */}
        <div className="mb-6 space-y-3">
            <div className="flex gap-2">
                <div className="flex-1 flex items-center bg-black border border-gray-800 rounded-xl px-3">
                    <Ticket size={16} className="text-gray-500 mr-2"/>
                    <input type="text" placeholder="CÓDIGO DE CUPÓN" className="bg-transparent w-full py-3 text-sm text-white outline-none uppercase" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                </div>
                <button onClick={handleApplyCoupon} className="bg-gray-800 text-white px-4 rounded-xl text-sm font-bold border border-gray-700 hover:bg-gray-700">OK</button>
            </div>
            {couponMsg && <p className={`text-xs font-bold ml-1 ${couponMsg.includes('❌') ? 'text-red-500' : 'text-green-500'}`}>{couponMsg}</p>}
        </div>

        <div className="bg-black/50 p-4 rounded-xl space-y-2 mb-6 border border-gray-800">
            <div className="flex justify-between text-gray-400 text-sm"><span>Subtotal</span><span>${subtotal}</span></div>
            {deliveryType === 'delivery' && <div className="flex justify-between text-gray-400 text-sm"><span>Envío</span><span>${deliveryCost}</span></div>}
            {discount > 0 && <div className="flex justify-between text-green-500 font-bold text-sm"><span>Descuento</span><span>-${discount}</span></div>}
            <div className="flex justify-between text-2xl font-black text-white pt-2 border-t border-gray-800 mt-2"><span>TOTAL</span><span className="text-yellow-500">${total}</span></div>
        </div>

        {/* DATOS PERSONALES */}
        <div className="space-y-3 mb-6">
            <input type="text" placeholder="Tu Nombre Completo" className="w-full p-3 bg-black border border-gray-700 rounded-xl font-medium outline-none text-white focus:border-red-600 transition" value={name} onChange={e => setName(e.target.value)} />
            <input type="tel" placeholder="Tu WhatsApp (Sin 0 ni 15)" className="w-full p-3 bg-black border border-gray-700 rounded-xl font-medium outline-none text-white focus:border-red-600 transition" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>

        <button onClick={handleCheckout} disabled={loading || cart.length === 0} className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-red-900/40 hover:bg-red-500 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <Loader2 className="animate-spin" /> : 'ENVIAR PEDIDO A WHATSAPP'}
        </button>

      </div>
    </div>
  )
}