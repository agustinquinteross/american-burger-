import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, Loader2 } from 'lucide-react'
import { useCart } from '../store/useCart'

export default function ProductModal({ product, isOpen, onClose }) {
  const addToCart = useCart(state => state.addToCart)
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [selections, setSelections] = useState({})

  useEffect(() => {
    if (product && isOpen) {
      fetchModifiers()
      setSelections({}) 
    }
  }, [product, isOpen])

  async function fetchModifiers() {
    setLoading(true)
    const { data: relations } = await supabase.from('product_modifiers').select('group_id, modifier_groups (id, name, min_selection, max_selection)').eq('product_id', product.id)

    if (!relations || relations.length === 0) {
      setGroups([]); setLoading(false); return
    }

    const groupIds = relations.map(r => r.group_id)
    const { data: options } = await supabase.from('modifier_options').select('*').in('group_id', groupIds).eq('is_available', true)

    const organizedGroups = relations.map(r => ({ ...r.modifier_groups, options: options.filter(o => o.group_id === r.group_id) }))
    setGroups(organizedGroups); setLoading(false)
  }

  const handleOptionClick = (group, option) => {
    setSelections(prev => {
      const currentSelected = prev[group.id] || []
      const isSelected = currentSelected.find(i => i.id === option.id)
      if (group.max_selection === 1) {
        if (isSelected && group.min_selection === 0) return { ...prev, [group.id]: [] }
        return { ...prev, [group.id]: [option] }
      }
      if (isSelected) return { ...prev, [group.id]: currentSelected.filter(i => i.id !== option.id) }
      else {
        if (currentSelected.length >= group.max_selection) return prev
        return { ...prev, [group.id]: [...currentSelected, option] }
      }
    })
  }

  const handleAddToCart = () => {
    for (const group of groups) {
      if ((selections[group.id] || []).length < group.min_selection) return alert(`⚠️ Faltan opciones en "${group.name}"`)
    }
    addToCart(product, Object.values(selections).flat())
    onClose()
  }

  const totalPrice = (product?.price || 0) + Object.values(selections).flat().reduce((acc, curr) => acc + curr.price, 0)

  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-800 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* HEADER FOTO */}
        <div className="relative h-48 bg-black shrink-0">
          <img src={product.image_url} className="w-full h-full object-cover opacity-80" alt={product.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"/>
          <button onClick={onClose} className="absolute top-3 right-3 bg-black/50 p-2 rounded-full text-white hover:bg-red-600 transition"><X size={20} /></button>
          <div className="absolute bottom-0 left-0 p-4">
             <h2 className="text-2xl font-black text-white italic uppercase">{product.name}</h2>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-900 text-gray-200">
          <p className="text-gray-400 text-sm mb-6 leading-relaxed bg-black/20 p-3 rounded-lg border border-gray-800">{product.description}</p>
          
          {loading ? <div className="flex justify-center"><Loader2 className="animate-spin text-red-600"/></div> : (
             <div className="space-y-6">
               {groups.map(group => (
                 <div key={group.id}>
                   <div className="flex justify-between items-center mb-3">
                     <h3 className="font-bold text-white text-lg">{group.name}</h3>
                     <span className="text-[10px] font-bold uppercase text-black bg-yellow-400 px-2 py-1 rounded">
                       {group.min_selection > 0 ? 'Requerido' : `Máx ${group.max_selection}`}
                     </span>
                   </div>
                   <div className="space-y-2">
                     {group.options.map(option => {
                       const isSelected = (selections[group.id] || []).find(i => i.id === option.id)
                       return (
                         <label key={option.id} className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-red-600 bg-red-900/20' : 'border-gray-700 hover:bg-gray-800'}`}>
                           <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-red-600 border-red-600' : 'border-gray-500'}`}>
                                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                              <span className={isSelected ? 'text-white font-bold' : 'text-gray-400'}>{option.name}</span>
                           </div>
                           <span className="text-yellow-400 font-bold text-sm">{option.price > 0 && `+$${option.price}`}</span>
                         </label>
                       )
                     })}
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 shrink-0">
          <button onClick={handleAddToCart} className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-lg flex justify-between px-6 hover:bg-red-500 shadow-lg shadow-red-900/40">
            <span>AGREGAR</span>
            <span>${totalPrice}</span>
          </button>
        </div>
      </div>
    </div>
  )
}