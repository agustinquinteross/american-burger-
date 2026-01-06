'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCart } from '../store/useCart'
import { ShoppingBag, Plus, Loader2, Star } from 'lucide-react'
import CartModal from '../components/CartModal'
import ProductModal from '../components/ProductModal'

export default function Home() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const cart = useCart((state) => state.cart)
  const cartTotal = useCart((state) => state.getTotal())

  useEffect(() => {
    async function fetchData() {
      const { data: cats } = await supabase.from('categories').select('*').order('sort_order')
      const { data: prods } = await supabase.from('products').select('*').eq('is_active', true)
      
      setCategories(cats || [])
      setProducts(prods || [])
      if (cats && cats.length > 0) setActiveCategory(cats[0].id)
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleProductClick = (product) => {
    setSelectedProduct(product)
    setIsProductModalOpen(true)
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-black text-red-600"><Loader2 className="animate-spin" size={48} /></div>

  return (
    <div className="min-h-screen pb-24 font-sans bg-black text-gray-100">
      
      {/* HEADER */}
      <header className="bg-black/95 backdrop-blur-sm p-4 sticky top-0 z-20 border-b border-gray-800">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-red-600 italic">AMERICAN <span className="text-yellow-500">BURGER</span></h1>
            <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">The Best in Catamarca</p>
          </div>
          <div className="relative p-2 cursor-pointer bg-gray-900 rounded-full hover:bg-gray-800 transition" onClick={() => setIsCartOpen(true)}>
            <ShoppingBag className="text-white" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-lg shadow-red-900/50">
                {cart.length}
              </span>
            )}
          </div>
        </div>

        {/* CATEGORÍAS */}
        <div className="max-w-4xl mx-auto flex gap-3 overflow-x-auto mt-4 pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all border ${
                activeCategory === cat.id
                  ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/50 transform scale-105'
                  : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* BANNER PROMOCIONAL (Solo visual) */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-gradient-to-r from-yellow-500 to-red-600 rounded-2xl p-6 text-black shadow-lg mb-4 flex justify-between items-center">
            <div>
                <h2 className="font-black text-2xl">¡HOY DELIVERY GRATIS!</h2>
                <p className="font-medium text-sm opacity-80">En pedidos superiores a $15.000</p>
            </div>
            <Star fill="black" size={32} className="animate-pulse"/>
        </div>
      </div>

      {/* LISTA DE PRODUCTOS (GRID RESPONSIVE) */}
      <main className="max-w-4xl mx-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products
          .filter((p) => p.category_id === activeCategory)
          .map((product) => (
            <div key={product.id} onClick={() => handleProductClick(product)} className="bg-gray-900/50 border border-gray-800 p-3 rounded-2xl flex gap-4 hover:border-red-900 transition-all cursor-pointer group hover:bg-gray-900">
              
              {/* IMAGEN */}
              <div className="w-28 h-28 bg-black rounded-xl overflow-hidden flex-shrink-0 relative">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🍔</div>
                )}
              </div>
              
              {/* INFO */}
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <h3 className="font-bold text-lg text-white leading-tight group-hover:text-red-500 transition-colors">{product.name}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-1">{product.description}</p>
                </div>
                
                <div className="flex justify-between items-end mt-2">
                  <span className="font-black text-xl text-yellow-400">
                    ${product.price}
                  </span>
                  <button className="bg-gray-800 text-white w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-red-600 transition-colors shadow-lg">
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {products.filter((p) => p.category_id === activeCategory).length === 0 && !loading && (
             <div className="col-span-full text-center py-20">
                <p className="text-gray-600 text-lg">No hay productos en esta categoría.</p>
             </div>
          )}
      </main>

      {/* BOTÓN VER PEDIDO FLOTANTE */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 max-w-md mx-auto z-40">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-red-600 text-white p-4 rounded-xl shadow-2xl shadow-red-900/50 flex justify-between items-center animate-in hover:bg-red-500 transition-transform hover:scale-[1.02] active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="bg-black/30 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                {cart.reduce((acc, item) => acc + item.quantity, 0)}
              </div>
              <span className="font-black uppercase tracking-wide">Ver mi Pedido</span>
            </div>
            <span className="font-black text-xl">${cartTotal}</span>
          </button>
        </div>
      )}

      {/* MODALES */}
      <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <ProductModal product={selectedProduct} isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} />

    </div>
  )
}