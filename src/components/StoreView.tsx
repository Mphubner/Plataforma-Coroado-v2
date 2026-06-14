import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Search, 
  ArrowLeft, 
  Plus, 
  Minus, 
  X, 
  CheckCircle2,
  Star,
  Heart,
  Share2,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import ReactQrCode from 'react-qr-code';

interface StoreViewProps {
  isAdmin?: boolean;
  userData?: any;
}

interface Product {
  id: string | number;
  name: string;
  price: number;
  category: string;
  img: string;
  description: string;
  sizes?: string[];
  colors?: string[];
  rating: number;
  reviews: number;
}

const PRODUCTS: Product[] = [
  { 
    id: 1, 
    name: "Camiseta Reconexão", 
    price: 79.90, 
    category: "Vestuário", 
    img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=500&auto=format&fit=crop",
    description: "Camiseta 100% algodão com estampa exclusiva da conferência Reconexão. Conforto e estilo para o seu dia a dia.",
    sizes: ["P", "M", "G", "GG"],
    colors: ["Preto", "Branco", "Cinza"],
    rating: 4.8,
    reviews: 124
  },
  { 
    id: 2, 
    name: "Moletom Coroado", 
    price: 159.90, 
    category: "Vestuário", 
    img: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=500&auto=format&fit=crop",
    description: "Moletom flanelado de alta qualidade. Perfeito para os dias mais frios, mantendo o estilo e a identidade.",
    sizes: ["P", "M", "G", "GG"],
    colors: ["Preto", "Azul Marinho"],
    rating: 4.9,
    reviews: 89
  },
  { 
    id: 3, 
    name: "Boné Crown Black", 
    price: 89.90, 
    category: "Acessórios", 
    img: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=500&auto=format&fit=crop",
    description: "Boné aba curva com bordado em alto relevo. Ajuste perfeito e durabilidade garantida.",
    colors: ["Preto", "Branco"],
    rating: 4.7,
    reviews: 56
  },
  { 
    id: 4, 
    name: "Caneca Cerâmica", 
    price: 45.00, 
    category: "Home", 
    img: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=500&auto=format&fit=crop",
    description: "Caneca de cerâmica 320ml. Ideal para o seu café ou chá, com design minimalista.",
    colors: ["Branco", "Preto"],
    rating: 4.9,
    reviews: 210
  },
  { 
    id: 5, 
    name: "Bíblia Edição Especial", 
    price: 120.00, 
    category: "Livros", 
    img: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?q=80&w=500&auto=format&fit=crop",
    description: "Bíblia Sagrada com capa dura e acabamento premium. Tradução Almeida Século 21.",
    rating: 5.0,
    reviews: 342
  },
  { 
    id: 6, 
    name: "Ingresso: Conferência Jovens", 
    price: 60.00, 
    category: "Ingressos", 
    img: "https://images.unsplash.com/photo-1540039155733-d730a53ffb4c?q=80&w=500&auto=format&fit=crop",
    description: "Ingresso válido para os dois dias de imersão da Conferência de Jovens Coroado. Inclui pulseira.",
    rating: 4.9,
    reviews: 15
  },
  { 
    id: 7, 
    name: "Pacote Missões: Boquira", 
    price: 250.00, 
    category: "Missões", 
    img: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=500&auto=format&fit=crop",
    description: "Ajude no projeto Boquira comprando este pacote simbólico que financia cestas básicas e logística.",
    rating: 5.0,
    reviews: 42
  },
  { 
    id: 8, 
    name: "Livro Base: Escola IDE", 
    price: 45.00, 
    category: "Livros", 
    img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=500&auto=format&fit=crop",
    description: "Livro texto oficial para o nivelamento e o Módulo 1 da Escola de Líderes IDE.",
    rating: 4.8,
    reviews: 180
  },
  { 
    id: 9, 
    name: "Pulseira Identidade", 
    price: 15.00, 
    category: "Acessórios", 
    img: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=500&auto=format&fit=crop",
    description: "Pulseira de silicone com gravação em baixo relevo. Um lembrete diário de quem você é em Cristo.",
    colors: ["Preto", "Cinza", "Azul"],
    rating: 4.5,
    reviews: 156
  },
  { 
    id: 10, 
    name: "Ecobag Logo", 
    price: 25.00, 
    category: "Acessórios", 
    img: "https://images.unsplash.com/photo-1597484662317-9bd7bdda2907?q=80&w=500&auto=format&fit=crop",
    description: "Sacola ecológica em algodão cru. Resistente e prática para o dia a dia.",
    rating: 4.8,
    reviews: 92
  },
];

const CATEGORIES = ["Todos", "Vestuário", "Acessórios", "Home", "Livros", "Papelaria", "Ingressos", "Missões"];

export function StoreView({ isAdmin = false, userData }: StoreViewProps) {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<{ product: Product; quantity: number; size?: string; color?: string }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [storeTab, setStoreTab] = useState("shop");

  const [showSimulatedCheckoutModal, setShowSimulatedCheckoutModal] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [newProductForm, setNewProductForm] = useState({
    name: "",
    price: "",
    category: "Vestuário",
    img: "",
    description: "",
    sizes: "",
    colors: ""
  });
  const [loading, setLoading] = useState(false);

  const tenantId = userData?.tenantId || 'tenant-1';

  const handleCheckout = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert('Entre com sua conta para finalizar a compra.');
        return;
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ items: cart })
      });
      const data = await response.json();
      if (data.success && data.init_point) {
        window.location.href = data.init_point;
      } else {
        console.warn('Backend checkout failed, opening simulation:', data.error);
        setShowSimulatedCheckoutModal(true);
      }
    } catch (e) {
      console.warn('Network checkout failed, opening simulation:', e);
      setShowSimulatedCheckoutModal(true);
    }
  };

  const handleSimulatedPaymentSuccess = async () => {
    setIsSimulatingPayment(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const currentUser = auth.currentUser;
      const totalAmount = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
      await addDoc(collection(db, 'orders'), {
        userId: currentUser?.uid || 'anonymous',
        userName: currentUser?.displayName || userData?.name || 'Membro',
        tenantId,
        items: cart.map(item => ({
          productId: String(item.product.id),
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          size: item.size || '',
          color: item.color || ''
        })),
        total: totalAmount,
        status: 'paid',
        paymentMethod: 'pix_simulation',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      alert("Pagamento simulado aprovado com sucesso! Obrigado pela compra.");
      setCart([]);
      setShowSimulatedCheckoutModal(false);
      setIsCartOpen(false);
    } catch (e) {
      console.error(e);
      alert("Erro ao processar pedido simulado: " + (e as Error).message);
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'products'), where('tenantId', '==', tenantId));
    const unsub = onSnapshot(q, (snap) => {
      setDbProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }) as unknown as Product));
    });
    return () => unsub();
  }, [tenantId]);

  const handleSeedProducts = async () => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      PRODUCTS.forEach(p => {
        const ref = doc(collection(db, 'products'));
        const { id, ...data } = p;
        batch.set(ref, {
          ...data,
          tenantId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      alert("Produtos padrão importados com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao importar produtos: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProductForm.name || !newProductForm.price) {
      alert("Por favor preencha o nome e preço do produto.");
      return;
    }
    try {
      setLoading(true);
      await addDoc(collection(db, 'products'), {
        name: newProductForm.name,
        price: Number(newProductForm.price),
        category: newProductForm.category,
        img: newProductForm.img || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=500&auto=format&fit=crop",
        description: newProductForm.description || "Descrição do produto",
        sizes: newProductForm.sizes ? newProductForm.sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
        colors: newProductForm.colors ? newProductForm.colors.split(',').map(c => c.trim()).filter(Boolean) : [],
        rating: 5.0,
        reviews: 0,
        tenantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewProductForm({
        name: "",
        price: "",
        category: "Vestuário",
        img: "",
        description: "",
        sizes: "",
        colors: ""
      });
      alert("Produto cadastrado com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao cadastrar produto: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string | number) => {
    if (typeof id !== 'string') {
      alert("Apenas produtos salvos no banco de dados podem ser excluídos.");
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (e) {
      console.error(e);
      alert("Erro ao excluir produto.");
    }
  };

  const catalogProducts = dbProducts.length > 0 ? dbProducts : PRODUCTS;

  const filteredProducts = catalogProducts.filter(p => {
    const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product, quantity: number = 1, size?: string, color?: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.size === size && item.color === color);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id && item.size === size && item.color === color
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, size, color }];
    });
  };

  const removeFromCart = (productId: string | number, size?: string, color?: string) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.size === size && item.color === color)));
  };

  const updateQuantity = (productId: string | number, delta: number, size?: string, color?: string) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId && item.size === size && item.color === color) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <div className="space-y-12 pb-20">
      {isAdmin && (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
             <button
                onClick={() => setStoreTab("shop")}
                className={cn(
                  "px-6 h-10 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                  storeTab === "shop" 
                    ? "bg-primary border-primary text-black" 
                    : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                )}
              >
                Loja Público
              </button>
             <button
                onClick={() => setStoreTab("admin")}
                className={cn(
                  "px-6 h-10 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                  storeTab === "admin" 
                    ? "bg-secondary border-secondary text-black" 
                    : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                )}
              >
                Gestão da Loja
              </button>
        </div>
      )}

      {storeTab === 'admin' && isAdmin ? (
        <div className="space-y-8">
           <div className="grid md:grid-cols-3 gap-8">
              {/* Form de Cadastro */}
              <Card className="bg-zinc-900 border-white/10 md:col-span-1">
                 <CardHeader>
                    <CardTitle className="font-serif italic text-xl">Novo Produto</CardTitle>
                    <CardDescription>Cadastre um produto no catálogo.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-white/40 uppercase">Nome</label>
                       <Input value={newProductForm.name} onChange={e => setNewProductForm({...newProductForm, name: e.target.value})} className="bg-black border-white/10" placeholder="Ex: Camisa Polo"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-white/40 uppercase">Preço (R$)</label>
                       <Input type="number" value={newProductForm.price} onChange={e => setNewProductForm({...newProductForm, price: e.target.value})} className="bg-black border-white/10" placeholder="Ex: 59.90"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-white/40 uppercase">Categoria</label>
                       <select value={newProductForm.category} onChange={e => setNewProductForm({...newProductForm, category: e.target.value})} className="w-full h-10 bg-black border border-white/10 rounded-md px-3 text-white">
                          {CATEGORIES.filter(c => c !== "Todos").map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-white/40 uppercase">URL da Imagem</label>
                       <Input value={newProductForm.img} onChange={e => setNewProductForm({...newProductForm, img: e.target.value})} className="bg-black border-white/10" placeholder="https://unsplash.com/..."/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-white/40 uppercase">Descrição</label>
                       <textarea value={newProductForm.description} onChange={e => setNewProductForm({...newProductForm, description: e.target.value})} className="w-full h-20 bg-black border border-white/10 rounded-md p-3 text-white text-sm" placeholder="Mais detalhes..."/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-white/40 uppercase">Tamanhos (Ex: P, M, G)</label>
                       <Input value={newProductForm.sizes} onChange={e => setNewProductForm({...newProductForm, sizes: e.target.value})} className="bg-black border-white/10" placeholder="P, M, G, GG"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-white/40 uppercase">Cores (Ex: Preto, Azul)</label>
                       <Input value={newProductForm.colors} onChange={e => setNewProductForm({...newProductForm, colors: e.target.value})} className="bg-black border-white/10" placeholder="Preto, Branco"/>
                    </div>
                    <Button onClick={handleCreateProduct} disabled={loading} className="w-full bg-primary text-black font-bold h-12">Cadastrar Produto</Button>
                 </CardContent>
              </Card>

              {/* Tabela/Lista de Produtos Cadastrados */}
              <div className="md:col-span-2 space-y-6">
                 <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold font-serif italic">Produtos Atuais</h3>
                    {dbProducts.length === 0 && (
                       <Button onClick={handleSeedProducts} disabled={loading} className="bg-secondary text-black font-bold">
                          Importar 10 Produtos Padrão
                       </Button>
                    )}
                 </div>
                 
                 <div className="space-y-4">
                    {dbProducts.map(p => (
                       <div key={p.id} className="p-4 bg-zinc-900 border border-white/10 rounded-2xl flex justify-between items-center gap-4">
                          <div className="flex items-center gap-4">
                             <img src={p.img} alt={p.name} className="w-12 h-12 object-cover rounded-lg" />
                             <div>
                                <h4 className="font-bold text-sm text-white">{p.name}</h4>
                                <p className="text-xs text-white/40">{p.category} • R$ {p.price.toFixed(2).replace('.', ',')}</p>
                             </div>
                          </div>
                          <Button onClick={() => handleDeleteProduct(p.id)} variant="ghost" size="sm" className="text-red-400 hover:text-red-500 hover:bg-red-500/10">Excluir</Button>
                       </div>
                    ))}
                    {dbProducts.length === 0 && (
                       <div className="p-8 text-center text-white/40 border border-dashed border-white/10 rounded-xl">
                          Nenhum produto cadastrado no banco para este tenant.
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      ) : (
        <>
          <AnimatePresence mode="wait">
            {!selectedProduct ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <Badge variant="outline" className="border-primary/50 text-primary px-4 py-1.5 rounded-full uppercase tracking-[0.2em] text-[10px] font-black bg-primary/5">
                  Coroado Store
                </Badge>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] font-serif italic text-white">
                  Vista a <br />
                  <span className="text-primary">Identidade</span>
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Buscar produtos..." 
                    className="pl-12 h-14 rounded-full bg-white/5 border-white/10 w-full md:w-64 focus:ring-primary/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => setIsCartOpen(true)}
                  className="bg-primary text-black hover:bg-primary/90 font-black h-14 rounded-full px-8 relative shadow-lg shadow-primary/20"
                >
                  <ShoppingBag className="mr-2 w-5 h-5" />
                  Carrinho
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-white text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-zinc-950">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-6 h-10 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                    selectedCategory === cat 
                      ? "bg-primary border-primary text-black" 
                      : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {filteredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -10 }}
                  onClick={() => setSelectedProduct(product)}
                  className="glass-card rounded-[2.5rem] overflow-hidden group cursor-pointer"
                >
                  <div className="aspect-[4/5] relative overflow-hidden bg-zinc-800">
                    <img 
                      src={product.img} 
                      alt={product.name} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700 opacity-60 group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-60" />
                    <div className="absolute top-6 right-6">
                      <Button size="icon" className="rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-primary hover:text-black transition-all">
                        <Heart className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-8 space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-primary font-black tracking-[0.2em]">{product.category}</p>
                      <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors font-serif italic">{product.name}</h3>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-2xl font-black text-white">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                      <Button size="sm" className="rounded-full bg-white/5 border border-white/10 hover:bg-primary hover:text-black font-black text-[10px] uppercase tracking-widest">
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="sm:col-span-2 lg:col-span-4 rounded-2xl border border-dashed border-white/10 bg-zinc-900/60 p-10 text-center text-white/50">
                  Catalogo da loja aguardando cadastro real de produtos.
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            <Button 
              variant="ghost" 
              onClick={() => setSelectedProduct(null)}
              className="text-white/60 hover:text-white font-bold"
            >
              <ArrowLeft className="mr-2 w-4 h-4" /> Voltar para a Loja
            </Button>

            <div className="grid lg:grid-cols-2 gap-16">
              {/* Product Images */}
              <div className="space-y-6">
                <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-zinc-900 border border-white/10 relative">
                  <img 
                    src={selectedProduct.img} 
                    alt={selectedProduct.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-8 right-8 flex flex-col gap-4">
                    <Button size="icon" className="rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-primary hover:text-black">
                      <Heart className="w-5 h-5" />
                    </Button>
                    <Button size="icon" className="rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-primary hover:text-black">
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="aspect-square rounded-2xl bg-zinc-900 border border-white/5 overflow-hidden cursor-pointer hover:border-primary transition-all">
                      <img src={selectedProduct.img} className="w-full h-full object-cover opacity-40 hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Info */}
              <div className="space-y-10">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Badge variant="outline" className="border-primary/50 text-primary px-4 py-1.5 rounded-full uppercase tracking-[0.2em] text-[10px] font-black bg-primary/5">
                      {selectedProduct.category}
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter font-serif italic text-white leading-none">
                      {selectedProduct.name}
                    </h1>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1 text-primary">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className={cn("w-4 h-4 fill-current", i > Math.floor(selectedProduct.rating) && "opacity-30")} />
                      ))}
                      <span className="ml-2 text-white font-bold">{selectedProduct.rating}</span>
                    </div>
                    <span className="text-white/40 font-medium">({selectedProduct.reviews} avaliações)</span>
                  </div>

                  <p className="text-4xl font-black text-white">R$ {selectedProduct.price.toFixed(2).replace('.', ',')}</p>
                  
                  <p className="text-xl text-white/60 leading-relaxed font-medium">
                    {selectedProduct.description}
                  </p>
                </div>

                <Separator className="bg-white/5" />

                {/* Options */}
                <div className="space-y-8">
                  {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-xs font-black uppercase tracking-widest text-white/40">Tamanho</p>
                      <div className="flex flex-wrap gap-3">
                        {selectedProduct.sizes.map(size => (
                          <button
                            key={size}
                            className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center font-black text-sm hover:border-primary hover:text-primary transition-all"
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-xs font-black uppercase tracking-widest text-white/40">Cor</p>
                      <div className="flex flex-wrap gap-3">
                        {selectedProduct.colors.map(color => (
                          <button
                            key={color}
                            className="px-6 h-12 rounded-2xl border border-white/10 flex items-center justify-center font-bold text-sm hover:border-primary hover:text-primary transition-all"
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button 
                      onClick={() => {
                        addToCart(selectedProduct);
                        setIsCartOpen(true);
                      }}
                      className="flex-1 bg-primary text-black hover:bg-primary/90 font-black h-16 rounded-full text-lg shadow-lg shadow-primary/20"
                    >
                      Adicionar ao Carrinho
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        addToCart(selectedProduct);
                        setIsCartOpen(true);
                      }}
                      className="flex-1 border-white/10 hover:bg-white/5 h-16 rounded-full font-black text-lg"
                    >
                      Comprar Agora
                    </Button>
                  </div>
                </div>

                {/* Extra Info */}
                <div className="grid grid-cols-2 gap-6 pt-6">
                  <div className="glass-card p-6 rounded-3xl space-y-2">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                    <p className="font-bold text-sm">Entrega em todo Brasil</p>
                    <p className="text-xs text-white/40">Frete grátis acima de R$ 200</p>
                  </div>
                  <div className="glass-card p-6 rounded-3xl space-y-2">
                    <RefreshCw className="w-6 h-6 text-primary" />
                    <p className="font-bold text-sm">Troca Garantida</p>
                    <p className="text-xs text-white/40">Até 30 dias para trocar</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-white/10 z-[101] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black font-serif italic text-white">Seu Carrinho</h2>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{cartCount} itens selecionados</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)} className="rounded-full hover:bg-white/5">
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-8">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                      <ShoppingBag className="w-10 h-10 text-white/20" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-bold text-white">Seu carrinho está vazio</p>
                      <p className="text-sm text-white/40">Que tal explorar nossos produtos e encontrar algo especial?</p>
                    </div>
                    <Button 
                      onClick={() => {
                        setIsCartOpen(false);
                        setSelectedProduct(null);
                      }}
                      className="bg-primary text-black font-black rounded-full px-8"
                    >
                      Explorar Loja
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {cart.map((item, i) => (
                      <div key={i} className="flex gap-6 group">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 flex-shrink-0">
                          <img src={item.product.img} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-white group-hover:text-primary transition-colors">{item.product.name}</h4>
                              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                {item.size && `Tam: ${item.size}`} {item.color && ` • Cor: ${item.color}`}
                              </p>
                            </div>
                            <button 
                              onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                              className="text-white/20 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 bg-white/5 rounded-full p-1 border border-white/5">
                              <button 
                                onClick={() => updateQuantity(item.product.id, -1, item.size, item.color)}
                                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.product.id, 1, item.size, item.color)}
                                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="font-black text-white">R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {cart.length > 0 && (
                <div className="p-8 bg-zinc-900/50 border-t border-white/10 space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40 font-medium">Subtotal</span>
                      <span className="text-white font-bold">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40 font-medium">Frete</span>
                      <span className="text-emerald-500 font-bold">Grátis</span>
                    </div>
                    <Separator className="bg-white/5" />
                    <div className="flex justify-between text-xl">
                      <span className="text-white font-black font-serif italic">Total</span>
                      <span className="text-primary font-black">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCheckout}
                    className="w-full h-16 rounded-full bg-primary text-black font-black text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Finalizar Compra
                  </Button>
                  <p className="text-[10px] text-center text-white/20 font-bold uppercase tracking-widest">Pagamento seguro via Coroado Pay</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de Checkout Simulado */}
      <AnimatePresence>
        {showSimulatedCheckoutModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSimulatedCheckoutModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm glass-card p-8 rounded-[2rem] space-y-6 text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto border border-primary/50 text-primary">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-black text-2xl font-serif italic">Coroado Pay (PIX)</h3>
                <p className="text-sm text-white/60 mt-2">Finalize sua compra pagando via PIX simulado.</p>
              </div>

              {isSimulatingPayment ? (
                <div className="space-y-4 py-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                  <p className="text-sm text-white/60 font-bold uppercase tracking-wider">Confirmando pagamento...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
                    <ReactQrCode value={`00020101021126580014br.gov.bcb.pix0136coroado@igreja.com.br5204000053039865802BR5915IGREJA COROADO6009SAO PAULO62070503***6304`} size={180} />
                    <p className="text-black text-[10px] mt-2 font-black uppercase tracking-widest">Aproxime o app do seu banco</p>
                  </div>
                  <div className="space-y-2">
                    <Button onClick={handleSimulatedPaymentSuccess} className="w-full bg-primary text-black font-black h-12 rounded-full uppercase text-xs tracking-wider">
                      Simular Sucesso do Pagamento
                    </Button>
                    <Button variant="ghost" onClick={() => setShowSimulatedCheckoutModal(false)} className="w-full text-white/40 hover:text-white">
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}

export default StoreView;
