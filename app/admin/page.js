'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Save, Power, LogOut, RefreshCw, ShoppingBag, Utensils, Plus, Trash2, Layers, X, DollarSign, MapPin, Ticket } from 'lucide-react'

export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('orders') 
  
  // LOGIN
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // DATOS
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [categories, setCategories] = useState([])
  const [modifierGroups, setModifierGroups] = useState([])
  const [coupons, setCoupons] = useState([])

  // EDICIÓN
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [uploading, setUploading] = useState(false)
  
  // EXTRAS
  const [selectedGroupId, setSelectedGroupId] = useState(null) 
  const [groupOptions, setGroupOptions] = useState([])

  // --- INICIO ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadAllData()
      else setLoading(false)
    })
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([fetchProducts(), fetchOrders(), fetchCategories(), fetchModifiers(), fetchCoupons()])
    setLoading(false)
  }

  // --- FETCHERS ---
  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*, categories(name), product_modifiers(group_id)').order('id')
    setProducts(data || [])
  }
  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false })
    setOrders(data || [])
  }
  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('id')
    setCategories(data || [])
  }
  const fetchModifiers = async () => {
    const { data } = await supabase.from('modifier_groups').select('*').order('id')
    setModifierGroups(data || [])
  }
  const fetchCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').order('code')
    setCoupons(data || [])
  }
  const fetchGroupOptions = async (groupId) => {
    const { data } = await supabase.from('modifier_options').select('*').eq('group_id', groupId).order('id')
    setGroupOptions(data || [])
    setSelectedGroupId(groupId)
  }

  // --- ACTIONS ---
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    else loadAllData()
    setLoading(false)
  }

  const handleImageUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return
    setUploading(true)
    const file = e.target.files[0]
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage.from('menu-images').upload(filePath, file)
    if (uploadError) { alert('Error: ' + uploadError.message); setUploading(false); return }

    const { data } = supabase.storage.from('menu-images').getPublicUrl(filePath)
    setEditForm({ ...editForm, image_url: data.publicUrl })
    setUploading(false)
  }

  const createProduct = async () => {
    const { data, error } = await supabase.from('products').insert([{ name: 'NUEVO', price: 0, category_id: categories[0]?.id || 1 }]).select()
    if (!error) {
      setProducts([...products, data[0]])
      setEditingId(data[0].id)
      setEditForm(data[0])
    }
  }

  const deleteProduct = async (id) => {
    if (!confirm('¿Eliminar producto?')) return
    await supabase.from('product_modifiers').delete().eq('product_id', id)
    await supabase.from('products').delete().eq('id', id)
    setProducts(products.filter(p => p.id !== id))
  }

  const saveProduct = async (id) => {
    const { error } = await supabase.from('products').update({
        name: editForm.name, description: editForm.description, price: editForm.price, image_url: editForm.image_url, category_id: editForm.category_id
    }).eq('id', id)
    if (error) return alert('Error al guardar')

    await supabase.from('product_modifiers').delete().eq('product_id', id)
    if (editForm.selectedGroups?.length > 0) {
        const inserts = editForm.selectedGroups.map(gid => ({ product_id: id, group_id: gid }))
        await supabase.from('product_modifiers').insert(inserts)
    }
    alert('✅ Guardado')
    setEditingId(null)
    loadAllData()
  }
  
  const toggleGroupSelection = (groupId) => {
    const current = editForm.selectedGroups || []
    if (current.includes(groupId)) setEditForm({ ...editForm, selectedGroups: current.filter(id => id !== groupId) })
    else setEditForm({ ...editForm, selectedGroups: [...current, groupId] })
  }

  const startEditingProduct = (product) => {
    const assignedGroupIds = product.product_modifiers ? product.product_modifiers.map(pm => pm.group_id) : []
    setEditForm({ ...product, selectedGroups: assignedGroupIds })
    setEditingId(product.id)
  }

  const toggleActive = async (id, currentStatus) => {
    await supabase.from('products').update({ is_active: !currentStatus }).eq('id', id)
    fetchProducts()
  }

  // -- RENDER --
  if (!session) return <LoginScreen email={email} setEmail={setEmail} password={password} setPassword={setPassword} handleLogin={handleLogin} loading={loading} />

  return (
    <div className="min-h-screen bg-black font-sans text-gray-200 pb-24">
      {/* NAVBAR */}
      <nav className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-50 flex justify-between items-center backdrop-blur-md bg-opacity-80">
        <div className="flex items-center gap-2">
            <span className="font-black text-xl italic text-red-600 tracking-tighter">AMERICAN <span className="text-yellow-500">ADMIN</span></span> 
        </div>
        <div className="flex gap-4">
          <button onClick={loadAllData} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"><RefreshCw size={18}/></button>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 text-xs bg-red-900/50 text-red-200 px-3 py-1 rounded hover:bg-red-600 hover:text-white transition border border-red-900"><LogOut size={14} /> Salir</button>
        </div>
      </nav>

      {/* TABS */}
      <div className="flex justify-center bg-gray-900/50 border-b border-gray-800 overflow-x-auto">
        {[
            { id: 'orders', icon: ShoppingBag, label: 'PEDIDOS' },
            { id: 'menu', icon: Utensils, label: 'MENÚ' },
            { id: 'extras', icon: Layers, label: 'EXTRAS' },
            { id: 'coupons', icon: Ticket, label: 'CUPONES' }
        ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-4 font-black text-sm tracking-wider transition-all whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'border-red-600 text-white bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                <tab.icon size={16}/> {tab.label}
            </button>
        ))}
      </div>

      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        
        {/* === PEDIDOS === */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
             {orders.length === 0 && <div className="text-center text-gray-600 mt-20 text-lg font-bold">Sin pedidos activos</div>}
             {orders.map(o => (
                <div key={o.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
                    <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-800/50 border-b border-gray-800 gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="font-black text-lg text-white">#{o.id}</span>
                                <span className="text-xs text-gray-400 bg-black px-2 py-1 rounded">{new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <h3 className="font-bold text-gray-200">{o.customer_name} <span className="text-gray-500 text-sm font-normal">({o.customer_phone})</span></h3>
                            {o.customer_address && <p className="text-xs text-red-400 flex items-center gap-1 mt-1"><MapPin size={12}/> {o.customer_address}</p>}
                        </div>
                        <select 
                            value={o.status} 
                            onChange={(e) => { supabase.from('orders').update({ status: e.target.value }).eq('id', o.id).then(loadAllData) }}
                            className={`bg-black border border-gray-700 text-sm font-bold rounded-lg p-2 outline-none focus:border-red-500 ${
                                o.status === 'pending' ? 'text-yellow-500' : 
                                o.status === 'cooking' ? 'text-red-500' : 
                                o.status === 'delivery' ? 'text-blue-400' : 'text-green-500'
                            }`}
                        >
                            <option value="pending">⏳ Pendiente</option>
                            <option value="cooking">🔥 Cocinando</option>
                            <option value="delivery">🛵 Enviado</option>
                            <option value="completed">✅ Entregado</option>
                        </select>
                    </div>
                    <div className="p-4">
                        {o.order_items.map(i => (
                            <div key={i.id} className="flex gap-3 py-2 border-b border-gray-800 last:border-0 text-sm">
                                <span className="font-bold text-red-500">{i.quantity}x</span>
                                <span className="text-gray-300">{i.product_name}</span>
                            </div>
                        ))}
                        <div className="mt-3 pt-3 flex justify-between items-center font-black text-xl text-white">
                            <span>TOTAL</span>
                            <span className="text-yellow-500">${o.total}</span>
                        </div>
                    </div>
                </div>
             ))}
          </div>
        )}

        {/* === MENÚ === */}
        {activeTab === 'menu' && (
           <div className="space-y-6">
             <div className="flex justify-end"><button onClick={createProduct} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 transition"><Plus size={18}/> NUEVO PRODUCTO</button></div>
             
             <div className="grid gap-4">
                {products.map(p => (
                    <div key={p.id} className={`bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start ${!p.is_active ? 'opacity-50 grayscale' : ''}`}>
                        <div className="w-20 h-20 bg-black rounded-lg overflow-hidden shrink-0 border border-gray-800">
                            {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full text-2xl">🍔</div>}
                        </div>
                        
                        <div className="flex-1 w-full">
                            {editingId === p.id ? (
                                <div className="bg-black p-4 rounded-xl border border-gray-700 space-y-4 animate-in fade-in">
                                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                        <h4 className="font-bold text-red-500">EDITANDO</h4>
                                        <button onClick={() => saveProduct(p.id)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold flex gap-1"><Save size={14}/> GUARDAR</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input className="bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:border-red-500 outline-none" placeholder="Nombre" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                                        <input className="bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:border-red-500 outline-none" type="number" placeholder="Precio" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} />
                                    </div>
                                    <textarea className="bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm w-full focus:border-red-500 outline-none" rows={2} placeholder="Descripción" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <select className="bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm outline-none" value={editForm.category_id} onChange={e => setEditForm({...editForm, category_id: e.target.value})}>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded p-2 overflow-hidden">
                                            <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs text-gray-400 w-full" />
                                            {uploading && <Loader2 className="animate-spin text-red-500" size={14}/>}
                                        </div>
                                    </div>
                                    
                                    {/* EXTRAS SELECTOR */}
                                    <div className="bg-gray-900 p-3 rounded border border-gray-800">
                                        <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Extras Habilitados:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {modifierGroups.map(g => (
                                                <label key={g.id} className={`text-xs px-2 py-1 rounded border cursor-pointer select-none transition ${editForm.selectedGroups?.includes(g.id) ? 'bg-red-600 text-white border-red-600 font-bold' : 'bg-black text-gray-500 border-gray-700 hover:border-gray-500'}`}>
                                                    <input type="checkbox" className="hidden" checked={editForm.selectedGroups?.includes(g.id) || false} onChange={() => toggleGroupSelection(g.id)} />
                                                    {editForm.selectedGroups?.includes(g.id) ? '✓ ' : ''}{g.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-white text-xs font-bold px-3 py-2">CANCELAR</button>
                                        <button onClick={() => saveProduct(p.id)} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded font-bold text-sm shadow-lg">GUARDAR CAMBIOS</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{p.name}</h3>
                                        <p className="text-xs text-gray-500">{p.categories?.name}</p>
                                        <p className="font-black text-yellow-500 mt-1">${p.price}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => toggleActive(p.id, p.is_active)} className={`p-2 rounded-lg border ${p.is_active ? 'border-green-900 bg-green-900/20 text-green-500' : 'border-gray-700 bg-gray-800 text-gray-500'}`}><Power size={18} /></button>
                                        <button onClick={() => startEditingProduct(p)} className="bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 hover:text-white px-4 py-2 rounded-lg font-bold text-sm border border-blue-900/50 transition">Editar</button>
                                        <button onClick={() => deleteProduct(p.id)} className="bg-red-900/20 text-red-500 hover:bg-red-900/40 p-2 rounded-lg border border-red-900/30"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
             </div>
           </div>
        )}

        {/* === EXTRAS === */}
        {activeTab === 'extras' && (
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 h-fit">
                    <h3 className="font-bold mb-4 text-white flex justify-between items-center">
                        GRUPOS <button onClick={async () => { const name = prompt('Nombre:'); if(name) { await supabase.from('modifier_groups').insert([{ name }]); loadAllData() } }} className="text-xs bg-red-600 text-white px-2 py-1 rounded flex gap-1"><Plus size={14}/> Nuevo</button>
                    </h3>
                    <div className="space-y-2">
                        {modifierGroups.map(g => (
                            <div key={g.id} onClick={() => fetchGroupOptions(g.id)} className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition ${selectedGroupId === g.id ? 'bg-red-900/20 border-red-600 text-white' : 'bg-black border-gray-800 text-gray-400 hover:border-gray-600'}`}>
                                <span className="font-bold text-sm">{g.name}</span>
                                <Trash2 size={14} className="hover:text-red-500" onClick={(e) => { e.stopPropagation(); if(confirm('Borrar?')) supabase.from('modifier_groups').delete().eq('id',g.id).then(loadAllData) }} />
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 h-fit">
                    <h3 className="font-bold mb-4 text-white flex justify-between items-center">
                        OPCIONES {selectedGroupId && (
                           <button onClick={async () => { const name = prompt('Nombre:'); if(name) { await supabase.from('modifier_options').insert([{ group_id: selectedGroupId, name }]); fetchGroupOptions(selectedGroupId) } }} className="text-xs bg-green-600 text-white px-2 py-1 rounded flex gap-1"><Plus size={14}/> Agregar</button>
                        )}
                    </h3>
                    {!selectedGroupId ? <p className="text-gray-600 text-center py-10 text-sm">Selecciona un grupo</p> : (
                        <div className="space-y-2">
                             {groupOptions.map(opt => (
                                 <div key={opt.id} className="flex gap-2 items-center bg-black p-2 rounded border border-gray-800">
                                     <input className="bg-transparent text-white text-sm font-medium w-full outline-none" defaultValue={opt.name} onBlur={(e) => supabase.from('modifier_options').update({ name: e.target.value }).eq('id', opt.id)} />
                                     <div className="flex items-center bg-gray-900 rounded px-2 border border-gray-700">
                                        <span className="text-xs text-gray-500">$</span>
                                        <input className="bg-transparent text-yellow-500 text-sm font-bold w-16 text-right outline-none" type="number" defaultValue={opt.price} onBlur={(e) => supabase.from('modifier_options').update({ price: e.target.value }).eq('id', opt.id)} />
                                     </div>
                                     <button onClick={() => supabase.from('modifier_options').delete().eq('id', opt.id).then(() => fetchGroupOptions(selectedGroupId))} className="text-gray-600 hover:text-red-500"><X size={16}/></button>
                                 </div>
                             ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* === CUPONES === */}
        {activeTab === 'coupons' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                 <div className="flex justify-end mb-4"><button onClick={async () => { const code = prompt('Código:'); if(code) { await supabase.from('coupons').insert([{ code: code.toUpperCase(), discount_type: 'percent', value: 10 }]); loadAllData() } }} className="bg-red-600 text-white px-3 py-2 rounded text-xs font-bold flex gap-2"><Plus size={14}/> NUEVO CUPÓN</button></div>
                 {coupons.map(c => (
                     <div key={c.code} className="flex justify-between items-center bg-black border border-gray-800 p-3 rounded mb-2">
                         <span className="font-bold text-white tracking-widest">{c.code}</span>
                         <div className="flex items-center gap-4">
                             <div className="flex items-center gap-1 text-gray-400 text-sm"><input type="number" className="bg-gray-800 w-12 text-center rounded text-white" defaultValue={c.value} onBlur={(e) => supabase.from('coupons').update({value: e.target.value}).eq('code', c.code)}/> % OFF</div>
                             <button onClick={() => { if(confirm('Borrar?')) supabase.from('coupons').delete().eq('code', c.code).then(loadAllData) }} className="text-red-500"><Trash2 size={16}/></button>
                         </div>
                     </div>
                 ))}
            </div>
        )}

      </main>
    </div>
  )
}

function LoginScreen({ email, setEmail, password, setPassword, handleLogin, loading }) {
  return <div className="min-h-screen bg-black flex items-center justify-center p-4"><div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl w-full max-w-sm shadow-2xl"><h1 className="text-3xl font-black text-center mb-6 text-white italic">AMERICAN <span className="text-red-600">LOGIN</span></h1><form onSubmit={handleLogin} className="space-y-4"><input type="email" placeholder="Email" className="w-full p-3 bg-black border border-gray-700 rounded-xl text-white outline-none focus:border-red-600 transition" value={email} onChange={e => setEmail(e.target.value)} /><input type="password" placeholder="Pass" className="w-full p-3 bg-black border border-gray-700 rounded-xl text-white outline-none focus:border-red-600 transition" value={password} onChange={e => setPassword(e.target.value)} /><button disabled={loading} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-900/20">{loading ? '...' : 'ENTRAR'}</button></form></div></div>
}