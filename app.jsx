import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Menu, X, ChevronRight, ChevronDown, Check, MapPin, Globe, Calendar, Award, Heart,
  Smartphone, Star, Sparkles, Upload, Camera, ChevronLeft, Filter, Search,
  Clock, User, ShieldCheck, DollarSign, Mail, Zap, MousePointerClick, Edit2, 
  Save, RefreshCw, CreditCard, MessageCircle, Plus, Trash2, Image as ImageIcon,
  Instagram, HelpCircle, Send, Navigation, Play, MessageSquare, Heart as HeartIcon
} from 'lucide-react';

// --- Firebase Setup ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' && __firebase_config ? JSON.parse(__firebase_config) : {};
let app, auth, db, appId;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
} catch (e) {
  console.error("Firebase init error", e);
}

const apiKey = "";

// --- TikTok Icon SVG ---
const TikTokIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.59-.98v6.68c0 5.24-4.05 9.35-9.29 9.35C2.11 24.08-1.5 19.34.46 14.19c.67-1.85 2.15-3.39 4-4.04 1.25-.43 2.59-.44 3.86-.19v4.18c-.85-.31-1.8-.39-2.69-.12-1.4.38-2.4 1.74-2.3 3.19.14 2.19 2.51 3.44 4.34 2.29.58-.35.91-1.04.91-1.72V0h4z"/>
  </svg>
);

const BlobFill = ({ className, color = "#FFF9E5" }) => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={`absolute -z-10 ${className}`}>
    <path fill={color} d="M47.7,-57.2C59.4,-44.6,65.1,-26.8,66.8,-9.5C68.6,7.8,66.5,24.6,57.1,38.1C47.7,51.6,31.1,61.9,12.5,65.8C-6.1,69.7,-26.6,67.3,-41.8,56.5C-57,45.7,-66.8,26.5,-68.6,6.9C-70.5,-12.8,-64.3,-32.9,-51.2,-46C-38.1,-59.1,-19.1,-65.2,-0.2,-64.9C18.6,-64.7,36,-58.2,47.7,-57.2Z" transform="translate(100 100)" />
  </svg>
);

const isValidImageSrc = (src) => {
  if (!src || typeof src !== 'string') return false;
  if (src.startsWith('data:image') && src.length > 100) return true;
  if (src.startsWith('http') || src.startsWith('blob:')) return true;
  if (src.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) return true;
  return false;
};

const getValidImage = (imgSrc, defaultImg) => {
  return isValidImageSrc(imgSrc) ? imgSrc : defaultImg;
};

const compressImage = async (file, targetMaxWidth = 800, targetMaxBytes = 300000) => {
  return new Promise((resolve, reject) => {
    if (!file.type.match(/image\/(jpeg|png|webp|gif)/i)) {
      reject(new Error(`サポートされていない形式です (${file.type})。iPhoneをお使いの場合は設定等をご確認ください。`));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let width = img.width; let height = img.height;
        if (width > targetMaxWidth) { height = Math.round((height * targetMaxWidth) / width); width = targetMaxWidth; }
        canvas.width = width; canvas.height = height;
        ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        let sizeInBytes = Math.round((dataUrl.length * 3) / 4);
        while (sizeInBytes > targetMaxBytes && quality > 0.2) {
            quality -= 0.1; dataUrl = canvas.toDataURL('image/jpeg', quality);
            sizeInBytes = Math.round((dataUrl.length * 3) / 4);
        }
        if (sizeInBytes > 1000000) { reject(new Error("画像が大きすぎます（1MB制限）")); } 
        else if (dataUrl.length < 100) { reject(new Error("画像の処理に失敗しました")); } 
        else { resolve(dataUrl); }
      };
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("ファイルの読み取りに失敗しました"));
    reader.readAsDataURL(file);
  });
};

const locationCoords = {
  'Shinsaibashi': { lat: 34.6745, lng: 135.5002 },
  'Horie': { lat: 34.6715, lng: 135.4925 },
  'Namba': { lat: 34.6630, lng: 135.5015 },
  'Hirakata': { lat: 34.8143, lng: 135.6510 },
  'Amagasaki': { lat: 34.7174, lng: 135.4096 },
  'Kyoto': { lat: 35.0116, lng: 135.7681 },
  'Umeda': { lat: 34.7024, lng: 135.4959 },
  'Kyotanabe': { lat: 34.8173, lng: 135.7725 },
  'Kyoto Sanjo': { lat: 35.0091, lng: 135.7702 }
};

function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const defaultMenus = [
  { name: 'Simple Gel (One Color / Gradation)', price: '¥6,000', duration: '90 min', description: 'A beautiful and simple single color or gradation gel nail.' },
  { name: 'Art Gel (Custom Design)', price: '¥8,500', duration: '120 min', description: 'Bring your own reference image!' },
  { name: 'Gel Removal (Hand / Foot)', price: '¥2,000', duration: '30 min', description: 'Safe and gentle removal.' }
];

// =========================================================================
// ⚠️ 本番公開用：ここに画像URLを1枚1枚コピペして設定していこう！
// =========================================================================
const initialDesignsData = [
  { 
    id: 1, style: 'Trendy', location: 'Horie', salon: 'myn', price: '¥8,800', 
    description: 'myn is a cozy private nail salon in Horie, Osaka.\nFrom trendy magnetic gels to simple chic styles, it’s the perfect spot to enjoy a cute nail experience during your trip to Japan♡', 
    salonMessage: 'Welcome to our private nail salon near Horie Park in Osaka, where you can relax and enjoy your time comfortably.',
    menus: [
      { name: '【Hand】Full Art Design', price: '¥12,500', duration: '2h', description: '' },
      { name: '【Hand】One Color', price: '¥8,800', duration: '1.5h', description: '' },
      { name: '【Hand】French Tips', price: '¥9,900', duration: '1.5h', description: '' }
    ],
    gallery: {
      designs: [
        "https://imgur.com/a/QBapUFw", // ← mynさんのネイル画像1枚目
        "https://imgur.com/wjOwQNg", // ← mynさんのネイル画像2枚目
        "https://imgur.com/REijEot", // ← 3枚目
        "https://imgur.com/aLoZmyq", // ← 4枚目
        "https://imgur.com/lrEvAWr"  // ← 5枚目
      ],
      interiors: [
        "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?q=80&w=800&auto=format&fit=crop", // ← 店内画像1枚目
        ""  // ← 店内画像2枚目
      ]
    }
  },
  { 
    id: 2, style: 'Nuance', location: 'Umeda', salon: "N'chell", price: '¥7,500', description: '', salonMessage: '', mensWelcome: true,
    menus: [
      { name: '【hand / foot】Glossy One Color', price: '¥7,500', duration: '60min', description: 'Choose up to 2 colors' },
      { name: '【hand / foot】Simple Art Course', price: '¥9,500', duration: '90min', description: 'Light trendy or nuance-style' },
      { name: '【hand / foot】Full Art Course', price: '¥12,000', duration: '120min', description: 'Bring-your-own design OK' }
    ],
    gallery: {
      designs: [
        "", // ← N'chellさんのネイル画像1枚目 (ここにURLを入れる)
        ""  // ← N'chellさんのネイル画像2枚目
      ],
      interiors: [
        ""  // ← N'chellさんの店内画像
      ]
    }
  },
  { 
    id: 3, style: 'Simple', location: 'Namba', salon: 'GIA', price: '¥5,000', 
    description: 'GIA is a cozy private nail salon in Namba, Osaka, specializing in elegant and natural-looking nail designs.', 
    salonMessage: 'We recommend gentle “fill-in” nail techniques to help protect your natural nails.',
    menus: [
      { name: '【hand】One Color', price: '¥5,000', duration: '60 min', description: '' },
      { name: '【hand】Magnet or Flash Nails', price: '¥5,500', duration: '60 min', description: '' }
    ],
    gallery: {
      designs: [
        "", // ← GIAさんのネイル画像1枚目
        ""  
      ],
      interiors: [
        ""  // ← GIAさんの店内画像
      ]
    }
  },
  { 
    id: 4, style: 'Kawaii', location: 'Kyotanabe', salon: 'nail Ronron', price: '¥6,000', 
    description: 'If you are looking for trending "Kawaii" styles like Korean, Wanghong, or French girly nails, this is the perfect salon for you!', 
    salonMessage: 'International guests are more than welcome! ♡\n\nDon\'t worry about the language barrier—we will gladly use translation apps to communicate carefully and recreate your ideal design as closely as possible ✨\n\nWhether it’s Korean-style, Wanghong, or French girly, leave all the "Kawaii" nails to us!\nWe also welcome bring-your-own-design references and can handle a wide variety of styles. ♡\n\n*If you send us your reference image in advance, we can provide an estimated price.',
    menus: [
      { name: '【Hand】One Color', price: '¥6,000', duration: '60 min', description: 'Simple and beautiful single-color gel nail.' },
      { name: '【Hand】Gradation', price: '¥7,000', duration: '60 min', description: 'Elegant color gradation.' },
      { name: '【Hand】French Tips', price: '¥8,000', duration: '90 min', description: 'Classic French tip design.' },
      { name: '【Hand】Art Course', price: 'Starts from ¥9,000', duration: '90 min', description: 'Custom nail art. Please bring your reference image!' },
      { name: '【Foot】One Color', price: '¥7,000', duration: '50 min', description: '*Requires an extra 30 mins if you need gel removal from another salon.' },
      { name: '【Foot】Art Course', price: '¥9,000', duration: '70 min', description: '*Requires an extra 30 mins if you need gel removal from another salon.' },
      { name: '【Hand Care】Basic Care Course', price: '¥4,000', duration: '30 min', description: 'Includes nail filing, cuticle care, and surface polishing.' },
      { name: '【Removal Only】Our Salon’s Gel', price: '¥4,000', duration: '30 min', description: 'Removal of gel nails previously done at our salon.' },
      { name: '【Removal Only】Other Salon’s Gel', price: '¥5,000', duration: '45 min', description: 'Removal of gel nails done at another salon.' },
      { name: '【Option】Nail Extension / Per Finger', price: '¥500', duration: '10 min', description: 'Price is per one finger.' },
      { name: '【Option】Nail Parts & Charms', price: 'Starts from ¥300', duration: '5 min', description: 'Price is per one piece.' },
      { name: '【Option】Long Nail Fee', price: '+¥1,000', duration: '-', description: 'Additional fee for very long nails.' }
    ],
    gallery: {
      designs: [
        "", // ← nail Ronronさんのネイル画像1枚目
        ""  
      ],
      interiors: [
        ""  // ← nail Ronronさんの店内画像
      ]
    }
  },
  { 
    id: 5, style: 'Nuance', location: 'Hirakata', salon: 'to.nail', price: 'TBD', 
    description: 'Coming soon! Details about to.nail will be updated shortly.', 
    salonMessage: 'We are currently preparing our menu and details. Please check back later! We look forward to welcoming you✨', 
    menus: [...defaultMenus], 
    gallery: {
      designs: ["", ""],
      interiors: [""]
    }
  },
  { 
    id: 6, style: 'Simple', location: 'Amagasaki', salon: "YUI's nail salon", price: 'TBD', 
    description: 'Coming soon! Details about YUI\'s nail salon will be updated shortly.', 
    salonMessage: 'We are currently preparing our menu and details. Please check back later! We look forward to welcoming you✨', 
    menus: [...defaultMenus], 
    gallery: {
      designs: ["", ""],
      interiors: [""]
    }
  },
  { 
    id: 7, style: 'Nuance', location: 'Kyoto Sanjo', salon: 'nail salon mutti', price: 'TBD', 
    description: 'Coming soon! Details about nail salon mutti will be updated shortly.', 
    salonMessage: 'We are currently preparing our menu and details. Please check back later! We look forward to welcoming you✨', 
    menus: [...defaultMenus], 
    gallery: {
      designs: ["", ""],
      interiors: [""]
    }
  }
];
// =========================================================================

const App = () => {
  const [user, setUser] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [designImages, setDesignImages] = useState([]);
  const [salonImages, setSalonImages] = useState([]);
  const [salonGalleries, setSalonGalleries] = useState({});
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const detailFileInputRef = useRef(null);
  const [snsData, setSnsData] = useState({ insta: [], tiktok: [] });
  const [uploadingSns, setUploadingSns] = useState(null);
  const snsFileInputRef = useRef(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [founderImage, setFounderImage] = useState(null);
  const founderFileInputRef = useRef(null);
  const [view, setView] = useState('home');
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingForm, setBookingForm] = useState({
    name: '', nationality: '', email: '', referenceImage: '', hasOff: 'No', hasLengthExtension: 'No',
    selectedMenuIdx: 0, 
    options: [{ date: '', time: '' }, { date: '', time: '' }, { date: '', time: '' }],
    agreedToTerms: false
  });
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [showImage, setShowImage] = useState(false);
  const [activeLocation, setActiveLocation] = useState('All');
  const [activeStyle, setActiveStyle] = useState('All');
  const [designs, setDesigns] = useState(initialDesignsData);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const locations = useMemo(() => {
    const all = designs.map(d => String(d.location || '')).filter(Boolean);
    return [...new Set(all)];
  }, [designs]);

  const styles = useMemo(() => {
    const all = designs.map(d => String(d.style || '')).filter(Boolean);
    return [...new Set(all)];
  }, [designs]);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error("Auth error", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      let customImagesMap = {};
      if (user && db) {
        try {
          const designsDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appData', 'designs'));
          if (designsDoc.exists()) setDesigns(designsDoc.data().items);
          
          const imagesSnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'designImages'));
          imagesSnapshot.forEach(docSnap => { customImagesMap[docSnap.id] = docSnap.data().imageSrc; });
          
          const galleryImagesSnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'galleryImages'));
          let loadedGalleries = {};
          galleryImagesSnapshot.forEach(docSnap => { 
            const data = docSnap.data();
            const sName = data.salon;
            if(!loadedGalleries[sName]) loadedGalleries[sName] = { designs: [], interiors: [] };
            if(data.type === 'design') loadedGalleries[sName].designs[data.index] = data.imageSrc;
            if(data.type === 'interior') loadedGalleries[sName].interiors[data.index] = data.imageSrc;
          });
          setSalonGalleries(loadedGalleries);
          const snsDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appData', 'snsFeeds'));
          if (snsDoc.exists()) setSnsData(snsDoc.data());
          const aboutDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appData', 'aboutInfo'));
          if (aboutDoc.exists() && aboutDoc.data().founderImage) { setFounderImage(aboutDoc.data().founderImage); }
        } catch (e) { console.error("Firestore error", e); }
      }

      const fetchImage = async (prompt) => {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
            method: 'POST',
            body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1 } })
          });
          const result = await res.json();
          return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
        } catch (e) { return "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop"; }
      };

      const s = await Promise.all(initialDesignsData.slice(0, 6).map(() => fetchImage("Aesthetic Japanese nail salon workstation")));
      setSalonImages(s);
      const d = await Promise.all(initialDesignsData.map(async (design) => {
        if (customImagesMap[design.id.toString()]) return customImagesMap[design.id.toString()];
        return await fetchImage(`Japanese professional nail art, ${design.style} style`);
      }));
      setDesignImages(d);
      
      setIsDataLoaded(true);
    };
    if (user) loadData();
  }, [user]);

  const currentHeroImages = useMemo(() => {
    let images = [];
    designs.forEach((design, idx) => {
      const sName = String(design.salon);
      let customImg = salonGalleries[sName]?.designs?.[0] || design.gallery?.designs?.[0];
      if (!isValidImageSrc(customImg)) customImg = null;
      const defaultImg = designImages[design.allDesignIds?.[0] - 1] || "https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=400&auto=format&fit=crop";
      images.push(customImg || defaultImg);
    });
    if(images.length > 0 && images.length < 6) { images = [...images, ...images]; }
    return images.filter(Boolean);
  }, [designs, salonGalleries, designImages]);

  const openImage = (src) => { setEnlargedImage(src); setTimeout(() => setShowImage(true), 10); };
  const closeImage = () => { setShowImage(false); setTimeout(() => setEnlargedImage(null), 300); };

  const handleScrollTo = (id) => {
    setView('home'); 
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        const y = element.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  const filteredSalons = useMemo(() => {
    const map = new Map();
    designs.forEach(d => {
      const sName = String(d.salon);
      if (!map.has(sName)) map.set(sName, { ...d, allStyles: new Set([String(d.style)]), allDesignIds: [d.id] });
      else { map.get(sName).allStyles.add(String(d.style)); if (!map.get(sName).allDesignIds.includes(d.id)) map.get(sName).allDesignIds.push(d.id); }
    });
    let result = Array.from(map.values()).filter(s => 
      (activeLocation === 'All' || String(s.location) === activeLocation) &&
      (activeStyle === 'All' || s.allStyles.has(activeStyle))
    );
    if (userLocation) {
      result = result.map(s => {
        const coords = locationCoords[String(s.location)] || null;
        const distance = coords ? getDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng) : Infinity;
        return { ...s, distance };
      }).sort((a, b) => a.distance - b.distance);
    }
    return result;
  }, [designs, activeLocation, activeStyle, userLocation]);

  const handleDesignClick = (design) => {
    setSelectedDesign({ 
      ...design, 
      description: design.description || `Experience top-tier Japanese nail art at ${design.salon}.`,
      salonMessage: design.salonMessage || `Welcome to ${design.salon}! We look forward to meeting you.`,
      menus: design.menus || [...defaultMenus]
    });
    setIsEditingInfo(false); setBookingSuccess(false); setBookingError(""); setBookingStep(1);
    setBookingForm({
      name: '', nationality: '', email: '', referenceImage: '', hasOff: 'No', hasLengthExtension: 'No',
      selectedMenuIdx: 0, options: [{ date: '', time: '' }, { date: '', time: '' }, { date: '', time: '' }],
      agreedToTerms: false
    });
    setView('detail'); window.scrollTo(0, 0);
  };

  const handleSaveInfo = async () => {
    setIsEditingInfo(false);
    const sanitizeDesign = (d) => ({
      id: d.id,
      style: typeof d.style === 'string' ? d.style : String(d.style || ''),
      location: typeof d.location === 'string' ? d.location : String(d.location || ''),
      salon: typeof d.salon === 'string' ? d.salon : String(d.salon || ''),
      price: typeof d.price === 'string' ? d.price : String(d.price || ''),
      description: typeof d.description === 'string' ? d.description : String(d.description || ''),
      salonMessage: typeof d.salonMessage === 'string' ? d.salonMessage : String(d.salonMessage || ''),
      mensWelcome: !!d.mensWelcome,
      menus: Array.isArray(d.menus) ? d.menus.map(m => ({
        name: typeof m.name === 'string' ? m.name : String(m.name || ''),
        duration: typeof m.duration === 'string' ? m.duration : String(m.duration || ''),
        price: typeof m.price === 'string' ? m.price : String(m.price || ''),
        description: typeof m.description === 'string' ? m.description : String(m.description || '')
      })) : []
    });
    let newDesigns;
    if (!designs.find(d => d.id === selectedDesign.id)) { newDesigns = [...designs, sanitizeDesign(selectedDesign)]; } 
    else { newDesigns = designs.map(d => d.id === selectedDesign.id ? sanitizeDesign(selectedDesign) : sanitizeDesign(d)); }
    setDesigns(newDesigns);
    if (user && db) {
      try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appData', 'designs'), { items: newDesigns }); } 
      catch (err) { alert("Error saving."); }
    }
  };

  const handleFinalSubmit = async () => {
    if (!bookingForm.name || !bookingForm.email || !bookingForm.referenceImage || !bookingForm.nationality) {
      setBookingError("Please fill in all required fields."); return;
    }
    if (!bookingForm.agreedToTerms) {
      setBookingError("Please agree to the Terms and Conditions to proceed."); return;
    }
    setIsBookingSubmitting(true);
    try {
      if (user && db) {
        await setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings')), { 
          ...bookingForm, salon: selectedDesign?.salon || 'Unknown', timestamp: new Date().toISOString() 
        });
      }
      setBookingStep(3);
    } catch (e) { 
      setBookingError("Failed to submit request."); 
    } finally { 
      setIsBookingSubmitting(false); 
    }
  };

  const handleNextStep = () => {
    if (!bookingForm.options[0].date || !bookingForm.options[0].time || !bookingForm.options[1].date || !bookingForm.options[1].time || !bookingForm.options[2].date || !bookingForm.options[2].time) {
      setBookingError("Please select 3 preferred dates/times.");
    } else { setBookingError(""); setBookingStep(2); }
  };

  const handleDetailImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file && user && db && uploadingSlot) {
      setIsUploadingImage(true);
      try {
        const compressedBase64 = await compressImage(file, 800, 300000);
        const salonName = String(selectedDesign.salon);
        const safeId = `${salonName.replace(/[^a-zA-Z0-9]/g, '')}_${uploadingSlot.type}_${uploadingSlot.index}`;
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'galleryImages', safeId), {
          salon: salonName, type: uploadingSlot.type, index: uploadingSlot.index, imageSrc: compressedBase64
        });
        setSalonGalleries(prev => {
          const current = prev[salonName] ? { ...prev[salonName] } : { designs: [], interiors: [] };
          const newD = [...(current.designs || [])]; const newI = [...(current.interiors || [])];
          if (uploadingSlot.type === 'design') newD[uploadingSlot.index] = compressedBase64;
          else newI[uploadingSlot.index] = compressedBase64;
          return { ...prev, [salonName]: { designs: newD, interiors: newI } };
        });
      } catch(e) { 
        console.error("Upload error:", e); 
        alert(`アップロードに失敗しました😭\n理由: ${e.message}`);
      } finally { 
        setIsUploadingImage(false); 
        if (detailFileInputRef.current) detailFileInputRef.current.value = "";
      }
    }
  };

  const handleFounderImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file && user && db) {
      setIsUploadingImage(true);
      try {
        const compressedBase64 = await compressImage(file, 400, 150000);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appData', 'aboutInfo'), { founderImage: compressedBase64 }, { merge: true });
        setFounderImage(compressedBase64);
      } catch(e) {
        console.error("Founder image upload failed", e);
        alert(`画像のアップロードに失敗しました😭\n理由: ${e.message}`);
      } finally {
        setIsUploadingImage(false);
        if (founderFileInputRef.current) founderFileInputRef.current.value = "";
      }
    }
  };

  const renderImageSlot = (type, index, className) => {
    if (!selectedDesign) return null;
    const sName = String(selectedDesign.salon);
    let customImg = salonGalleries[sName]?.[type + 's']?.[index] || selectedDesign.gallery?.[type + 's']?.[index];
    if (!isValidImageSrc(customImg)) customImg = null;
    let defaultImg = type === 'design' ? designImages[selectedDesign.allDesignIds[index] - 1] : salonImages[0];
    const imgSrc = getValidImage(customImg, defaultImg || "https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=400&auto=format&fit=crop");

    return (
      <div className={`relative overflow-hidden bg-[#F0E6D2] group shadow-sm border border-[#F0E6D2] ${className} ${!isEditingInfo ? 'cursor-pointer' : ''}`} onClick={() => !isEditingInfo && openImage(imgSrc)}>
         <img src={imgSrc} className={`w-full h-full object-cover transition-transform duration-700 ${!isEditingInfo ? 'group-hover:scale-110' : ''}`} alt="" />
         {isEditingInfo ? (
           <button onClick={(e) => { e.stopPropagation(); setUploadingSlot({ type, index }); detailFileInputRef.current?.click(); }} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer"><Upload size={20} className="mb-1" /><span className="text-[10px] font-bold">Change</span></button>
         ) : (
           <div className="absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 flex items-center justify-center pointer-events-none"><div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center text-[#2B4562] shadow-sm backdrop-blur-sm"><Search size={20} /></div></div>
         )}
      </div>
    );
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#FFFDF7] flex items-center justify-center font-serif text-[#C8A15E] animate-pulse text-xl">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-[#2B4562] font-sans selection:bg-[#FFD88B] overflow-x-hidden relative">
      <nav className="fixed w-full z-50 bg-[#FFFDF7]/90 backdrop-blur-md px-6 py-4 border-b border-[#F0E6D2]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-serif font-bold tracking-tight cursor-pointer" onClick={() => { setView('home'); window.scrollTo(0,0); }}>Nailoo</h1>
          <div className="flex gap-6 items-center">
            <div className="hidden md:flex gap-6 text-xs font-bold uppercase tracking-widest text-gray-500">
              <button onClick={() => handleScrollTo('salons')}>Salons</button>
              <button onClick={() => handleScrollTo('how')}>How it works</button>
              <button onClick={() => { setView('about'); window.scrollTo(0,0); }}>About</button>
            </div>
            <button onClick={() => handleScrollTo('salons')} className="bg-[#2B4562] text-white px-5 py-2 rounded-full text-xs font-bold hover:scale-105 transition-all">Book Now</button>
          </div>
        </div>
      </nav>

      {view === 'home' && (
        <>
          <section className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-5xl md:text-7xl font-serif leading-tight">Make your Japan trip even <span className="italic text-[#C8A15E]">cuter</span></h2>
              <p className="text-lg text-gray-500 max-w-sm">Discover unique Japanese nail art and book in seconds.</p>
              <button onClick={() => handleScrollTo('salons')} className="bg-[#2B4562] text-white px-8 py-4 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-[#1A2E44]">Browse Salons <ChevronRight size={16} /></button>
            </div>
            <div className="relative w-full overflow-hidden group">
              <style>{`@keyframes hero-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-hero-marquee { display: flex; width: max-content; animation: hero-marquee 30s linear infinite; }`}</style>
              <div className="animate-hero-marquee gap-4">
                {[...currentHeroImages, ...currentHeroImages].map((img, idx) => (
                  <div key={idx} className="w-40 md:w-56 flex-none"><img src={img} className="w-full aspect-square object-cover rounded-[2rem] shadow-sm" alt="" /></div>
                ))}
              </div>
            </div>
          </section>

          <section id="salons" className="py-24 px-6 max-w-7xl mx-auto">
             <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-[#F0E6D2] pb-8 mb-12">
              <h3 className="text-4xl font-serif font-bold">Find Your Salon</h3>
              <div className="flex flex-wrap gap-4 w-full md:w-auto">
                <button onClick={() => {}} className="bg-white text-[#2B4562] border border-[#F0E6D2] px-6 py-3 rounded-full text-xs font-bold shadow-sm flex items-center gap-2"><MapPin size={14}/> Near Me</button>
                <select onChange={(e) => setActiveLocation(e.target.value)} className="bg-white border border-[#F0E6D2] px-6 py-3 rounded-full text-xs font-bold outline-none"><option value="All">All Locations</option>{locations.map(l => <option key={l} value={l}>{l}</option>)}</select>
                <select onChange={(e) => setActiveStyle(e.target.value)} className="bg-white border border-[#F0E6D2] px-6 py-3 rounded-full text-xs font-bold outline-none"><option value="All">All Styles</option>{styles.map(s => <option key={s} value={s}>{s}</option>)}</select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredSalons.map((salon) => {
                const sName = String(salon.salon);
                const did = salon.allDesignIds[0] || 1;
                
                let designImg1 = salonGalleries[sName]?.designs?.[0] || salon.gallery?.designs?.[0];
                if (!isValidImageSrc(designImg1)) designImg1 = null;
                if (!designImg1) designImg1 = designImages[did - 1] || "https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?q=80&w=800&auto=format&fit=crop";

                let designImg2 = salonGalleries[sName]?.designs?.[1] || salon.gallery?.designs?.[1];
                if (!isValidImageSrc(designImg2)) designImg2 = null;
                if (!designImg2) designImg2 = designImages[did] || "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop";

                let interiorImg = salonGalleries[sName]?.interiors?.[0] || salon.gallery?.interiors?.[0];
                if (!isValidImageSrc(interiorImg)) interiorImg = null;
                if (!interiorImg) interiorImg = salonImages[0] || "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?q=80&w=800&auto=format&fit=crop";

                return (
                <div key={salon.id} onClick={() => handleDesignClick(salon)} className="group overflow-hidden rounded-[2rem] bg-white border border-[#F0E6D2] shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col">
                  <div className="relative h-56 overflow-hidden bg-[#F0E6D2] flex">
                    <div className="w-2/3 h-full border-r-2 border-white overflow-hidden">
                      <img src={designImg1} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Main Design" />
                    </div>
                    <div className="w-1/3 h-full flex flex-col">
                      <div className="h-1/2 w-full border-b-2 border-white overflow-hidden relative">
                        <img src={interiorImg} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Salon Interior" />
                        <div className="absolute bottom-1 right-1 bg-white/80 p-1 rounded-full"><Camera size={10} className="text-[#C8A15E]" /></div>
                      </div>
                      <div className="h-1/2 w-full overflow-hidden">
                         <img src={designImg2} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Sub Design" />
                      </div>
                    </div>
                    <div className="absolute top-4 left-4"><div className="bg-white/90 px-3 py-1.5 rounded-full text-[10px] font-bold text-[#C8A15E] border border-[#F0E6D2] shadow-sm">{String(salon.location)}</div></div>
                  </div>
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div><h4 className="text-xl font-serif font-bold text-[#2B4562]">{String(salon.salon)}</h4><p className="text-xs text-gray-500 mt-2 line-clamp-2">{String(salon.description)}</p></div>
                    <div className="mt-4 pt-4 border-t border-[#F0E6D2] flex justify-between items-center text-sm font-bold"><span className="text-gray-400 text-xs">Starts from</span><span className="text-[#C8A15E]">{String(salon.price)}</span></div>
                  </div>
                </div>
              )})}
            </div>
          </section>

          <section id="how" className="py-24 bg-white relative border-t border-[#F0E6D2]">
            <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="text-center mb-16">
                <h3 className="text-4xl font-serif font-bold text-[#2B4562]">How it works</h3>
                <p className="text-gray-500 mt-4">Book your dream nails in 3 simple steps.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="bg-[#FFFDF7] p-8 rounded-3xl border border-[#F0E6D2] text-center shadow-sm relative pt-12 group hover:-translate-y-2 transition-transform duration-300">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-[#2B4562] text-white rounded-full flex items-center justify-center font-bold text-xl border-4 border-white shadow-sm group-hover:scale-110 transition-transform">1</div>
                  <Search className="mx-auto text-[#C8A15E] mb-4 group-hover:animate-bounce" size={32} />
                  <h4 className="text-lg font-bold text-[#2B4562] mb-2">Find a Salon</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">Browse our curated list of tourist-friendly nail salons in Japan based on your location and style.</p>
                </div>
                <div className="bg-[#FFFDF7] p-8 rounded-3xl border border-[#F0E6D2] text-center shadow-sm relative pt-12 group hover:-translate-y-2 transition-transform duration-300">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-[#2B4562] text-white rounded-full flex items-center justify-center font-bold text-xl border-4 border-white shadow-sm group-hover:scale-110 transition-transform">2</div>
                  <Calendar className="mx-auto text-[#C8A15E] mb-4 group-hover:animate-bounce" size={32} />
                  <h4 className="text-lg font-bold text-[#2B4562] mb-2">Book easily</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">Submit your booking request with your preferred dates and reference images. We'll handle the rest!</p>
                </div>
                <div className="bg-[#FFFDF7] p-8 rounded-3xl border border-[#F0E6D2] text-center shadow-sm relative pt-12 group hover:-translate-y-2 transition-transform duration-300">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-[#2B4562] text-white rounded-full flex items-center justify-center font-bold text-xl border-4 border-white shadow-sm group-hover:scale-110 transition-transform">3</div>
                  <Sparkles className="mx-auto text-[#C8A15E] mb-4 group-hover:animate-bounce" size={32} />
                  <h4 className="text-lg font-bold text-[#2B4562] mb-2">Get Kawaii Nails</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">Visit the salon stress-free and enjoy top-tier Japanese nail art to make your trip unforgettable.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="why" className="py-24 bg-[#FFF9E5] relative overflow-hidden">
            <BlobFill className="w-[800px] text-white/50 -top-40 -right-40 opacity-50" />
            <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="text-center mb-16">
                <h3 className="text-4xl font-serif font-bold text-[#2B4562]">Why choose Nailoo?</h3>
                <p className="text-gray-500 mt-4">We make your nail experience in Japan smooth and stress-free.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
                <div className="space-y-4 group hover:-translate-y-2 transition-transform duration-300 cursor-default bg-white/50 p-6 rounded-3xl border border-[#F0E6D2]/50 hover:bg-white hover:shadow-xl">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-[#C8A15E] shadow-sm group-hover:scale-110 transition-transform"><MessageCircle size={28} /></div>
                  <h4 className="text-xl font-bold text-[#2B4562]">No Language Barrier</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">Our partner salons welcome international guests. We help ensure your desired design is communicated perfectly.</p>
                </div>
                <div className="space-y-4 group hover:-translate-y-2 transition-transform duration-300 cursor-default bg-white/50 p-6 rounded-3xl border border-[#F0E6D2]/50 hover:bg-white hover:shadow-xl">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-[#C8A15E] shadow-sm group-hover:scale-110 transition-transform"><ShieldCheck size={28} /></div>
                  <h4 className="text-xl font-bold text-[#2B4562]">Trusted Salons Only</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">We carefully select high-quality, tourist-friendly salons so you can relax and enjoy the best Japanese hospitality.</p>
                </div>
                <div className="space-y-4 group hover:-translate-y-2 transition-transform duration-300 cursor-default bg-white/50 p-6 rounded-3xl border border-[#F0E6D2]/50 hover:bg-white hover:shadow-xl">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-[#C8A15E] shadow-sm group-hover:scale-110 transition-transform"><CreditCard size={28} /></div>
                  <h4 className="text-xl font-bold text-[#2B4562]">Secure Online Payment</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">Pay securely in advance via Stripe. No need to worry about carrying cash or calculating foreign exchange rates at the salon.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="py-24 px-6 max-w-4xl mx-auto text-center bg-white border-t border-[#F0E6D2]">
            <h3 className="text-4xl font-serif font-bold text-[#2B4562] mb-6">About Us</h3>
            <p className="text-gray-500 mb-8 leading-relaxed max-w-2xl mx-auto">
              We started Nailoo to help international visitors experience the amazing quality of Japanese nail art and create wonderful, unforgettable memories during their trip to Japan.
            </p>
            <button onClick={() => { setView('about'); window.scrollTo(0,0); }} className="text-[#C8A15E] font-bold uppercase tracking-widest border-b-2 border-[#C8A15E] pb-1 hover:text-[#2B4562] hover:border-[#2B4562] transition-colors">
              Read Our Story
            </button>
          </section>
        </>
      )}

      {view === 'detail' && (
        <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">
          <button onClick={() => setView('home')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#2B4562] mb-8 transition-colors"><ChevronLeft size={16} /> Back</button>
          {selectedDesign && (
            <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="bg-white rounded-[3rem] p-6 md:p-10 shadow-xl border border-[#F0E6D2] grid md:grid-cols-2 gap-10 items-start relative overflow-hidden">
                <input type="file" ref={detailFileInputRef} className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handleDetailImageUpload} />
                <div className="space-y-8">
                  <div>
                    <h4 className="flex items-center gap-2 mb-3 text-[#2B4562] font-bold"><Sparkles size={18} className="text-[#C8A15E]"/> Nail Designs</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {renderImageSlot('design', 0, "col-span-4 aspect-video rounded-3xl")}
                      {renderImageSlot('design', 1, "col-span-1 aspect-square rounded-2xl")}
                      {renderImageSlot('design', 2, "col-span-1 aspect-square rounded-2xl")}
                      {renderImageSlot('design', 3, "col-span-1 aspect-square rounded-2xl")}
                      {renderImageSlot('design', 4, "col-span-1 aspect-square rounded-2xl")}
                    </div>
                  </div>
                  <div>
                    <h4 className="flex items-center gap-2 mb-3 text-[#2B4562] font-bold"><Camera size={18} className="text-[#C8A15E]"/> Salon Atmosphere</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {renderImageSlot('interior', 0, "col-span-1 aspect-square rounded-2xl")}
                      {renderImageSlot('interior', 1, "col-span-1 aspect-square rounded-2xl")}
                    </div>
                  </div>
                </div>
                <div className="space-y-6 relative">
                  <div className="flex justify-end absolute -top-4 -right-2">
                    {isEditingInfo ? (
                      <button onClick={handleSaveInfo} className="text-xs font-bold text-[#C8A15E] bg-[#FFF9E5] px-3 py-1.5 rounded-full border border-[#FFD88B] hover:bg-[#C8A15E] hover:text-white transition-colors flex items-center gap-1 shadow-sm"><Save size={14}/> Save</button>
                    ) : (
                      <button onClick={() => setIsEditingInfo(true)} className="text-xs font-bold text-[#C8A15E] bg-[#FFF9E5] px-3 py-1.5 rounded-full border border-[#FFD88B] hover:bg-[#C8A15E] hover:text-white transition-colors flex items-center gap-1 shadow-sm"><Edit2 size={14}/> Edit</button>
                    )}
                  </div>
                  {isEditingInfo ? (
                    <div className="space-y-4 pt-6">
                      <input value={selectedDesign.salon} onChange={e => setSelectedDesign({...selectedDesign, salon: e.target.value})} className="w-full text-3xl font-serif font-bold text-[#2B4562] border-b-2 border-[#C8A15E] outline-none" placeholder="Salon Name" />
                      <textarea value={selectedDesign.description} onChange={e => setSelectedDesign({...selectedDesign, description: e.target.value})} className="w-full text-sm text-gray-500 border border-[#F0E6D2] rounded-xl p-3 min-h-[100px]" placeholder="Description" />
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2">
                      <h2 className="text-4xl font-serif font-bold text-[#2B4562]">{selectedDesign.salon}</h2>
                      <div className="flex items-center gap-2 text-sm text-gray-500 font-medium"><MapPin size={16}/> {selectedDesign.location}</div>
                      <p className="text-gray-500 leading-relaxed text-sm whitespace-pre-wrap">{selectedDesign.description}</p>
                      <div className="bg-[#FFF9E5]/50 p-4 rounded-2xl border border-[#FFD88B]/30 italic text-sm text-gray-500 whitespace-pre-wrap">"{selectedDesign.salonMessage || 'Welcome!'}"</div>
                      <div className="pt-6 border-t border-[#F0E6D2]">
                        <h4 className="text-sm font-bold text-[#2B4562] mb-4">Salon Menu</h4>
                        <div className="grid gap-3">
                          {selectedDesign.menus?.map((m, idx) => (
                            <details key={idx} className="group bg-[#FFF9E5]/30 rounded-xl border border-[#F0E6D2]/50 hover:border-[#FFD88B] transition-colors cursor-pointer marker:content-['']">
                              <summary className="flex justify-between items-center p-3 list-none">
                                <div>
                                  <div className="text-xs font-bold text-[#2B4562] flex items-center gap-1">{m.name} <ChevronRight size={14} className="text-[#C8A15E] group-open:rotate-90 transition-transform" /></div>
                                  <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-1"><Clock size={10}/> {m.duration}</div>
                                </div>
                                <div className="text-sm font-bold text-[#C8A15E]">{m.price}</div>
                              </summary>
                              {m.description && <div className="px-3 pb-3 text-xs text-gray-500 border-t border-[#F0E6D2]/50 pt-2 mt-1 leading-relaxed">{m.description}</div>}
                            </details>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#FFFDF7] p-8 md:p-12 rounded-[3rem] border border-[#F0E6D2] shadow-lg text-center">
                <h3 className="text-3xl font-serif font-bold mb-10">Book Your Experience</h3>
                <div className="max-w-xl mx-auto">
                  {bookingStep === 1 ? (
                    <div className="space-y-6 text-left">
                      <div className="mb-8">
                        <label className="text-sm font-bold uppercase text-[#2B4562] mb-3 block">Select Menu</label>
                        <div className="relative">
                          <select value={bookingForm.selectedMenuIdx} onChange={(e) => setBookingForm({...bookingForm, selectedMenuIdx: Number(e.target.value)})} className="w-full p-4 rounded-xl border border-[#F0E6D2] bg-white font-bold text-[#2B4562] appearance-none shadow-sm outline-none">
                            {selectedDesign.menus.map((m, idx) => (<option key={idx} value={idx}>{m.name} - {m.price}</option>))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                      </div>
                      <div className="pt-8 border-t border-[#F0E6D2]"><label className="text-sm font-bold uppercase text-[#2B4562] block mb-4">Preferred Date & Time (Select 3)</label></div>
                      {[1, 2, 3].map((num) => (
                        <div key={num} className="bg-white p-4 rounded-2xl border border-[#F0E6D2] flex gap-3">
                           <input type="date" value={bookingForm.options[num-1].date} onChange={(e) => { const n = [...bookingForm.options]; n[num-1].date = e.target.value; setBookingForm({...bookingForm, options: n}); }} className="w-1/2 p-3 rounded-xl border border-[#F0E6D2] text-sm outline-none" />
                           <select value={bookingForm.options[num-1].time} onChange={(e) => { const n = [...bookingForm.options]; n[num-1].time = e.target.value; setBookingForm({...bookingForm, options: n}); }} className="w-1/2 p-3 rounded-xl border border-[#F0E6D2] text-sm outline-none">
                             <option value="">Select Time</option>
                             <option>10:00 AM</option><option>12:00 PM</option><option>2:00 PM</option><option>4:00 PM</option><option>6:00 PM</option>
                           </select>
                        </div>
                      ))}
                      {bookingError && <p className="text-red-500 text-xs font-bold text-center">{bookingError}</p>}
                      <button onClick={handleNextStep} className="w-full bg-[#2B4562] text-white py-5 rounded-full font-bold shadow-xl hover:bg-[#1A2E44] transition-all">Next Step</button>
                    </div>
                  ) : bookingStep === 2 ? (
                    <div className="space-y-6 text-left">
                      <div className="bg-white p-6 rounded-2xl border border-[#F0E6D2] space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <input type="text" placeholder="Full Name *" value={bookingForm.name} onChange={e => setBookingForm({...bookingForm, name: e.target.value})} className="w-full p-4 rounded-xl border border-[#F0E6D2] outline-none" />
                          <input type="text" placeholder="Nationality *" value={bookingForm.nationality} onChange={e => setBookingForm({...bookingForm, nationality: e.target.value})} className="w-full p-4 rounded-xl border border-[#F0E6D2] outline-none" />
                        </div>
                        <input type="email" placeholder="Email Address *" value={bookingForm.email} onChange={e => setBookingForm({...bookingForm, email: e.target.value})} className="w-full p-4 rounded-xl border border-[#F0E6D2] outline-none" />
                        <div className="p-4 border-2 border-dashed border-[#F0E6D2] rounded-xl flex flex-col items-center gap-2 cursor-pointer hover:border-[#C8A15E] transition-colors relative">
                          {bookingForm.referenceImage ? ( <img src={bookingForm.referenceImage} className="w-20 h-20 object-cover rounded-lg" alt="" /> ) : (
                            <><Upload size={20}/><span className="text-xs font-bold text-[#2B4562]">Attach Reference Image</span><p className="text-[10px] text-gray-500 text-center px-4 leading-relaxed">Please attach an image. Our artist will use this as a reference!</p></>
                          )}
                          <input type="file" accept="image/jpeg, image/png, image/webp" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async e => { 
                            const f = e.target.files[0]; 
                            if(f) { 
                              try {
                                const compressed = await compressImage(f, 600, 200000);
                                setBookingForm({...bookingForm, referenceImage: compressed});
                              } catch(err) {
                                alert(`画像エラー: ${err.message}`);
                              }
                            } 
                          }} />
                        </div>
                      </div>
                      <div className="flex items-start gap-3 mt-2 px-2">
                        <input type="checkbox" id="terms" checked={bookingForm.agreedToTerms} onChange={e => setBookingForm({...bookingForm, agreedToTerms: e.target.checked})} className="mt-1 w-4 h-4 rounded border-[#F0E6D2] text-[#2B4562]" />
                        <label htmlFor="terms" className="text-[11px] text-gray-500 leading-snug cursor-pointer">I have read and agree to the <button onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} className="text-[#C8A15E] underline">Terms and Conditions</button></label>
                      </div>
                      {bookingError && <p className="text-red-500 text-xs font-bold text-center">{bookingError}</p>}
                      <button onClick={handleFinalSubmit} disabled={isBookingSubmitting} className="w-full bg-[#2B4562] text-white py-5 rounded-full font-bold shadow-xl flex items-center justify-center gap-2 mt-4 hover:bg-[#1A2E44] transition-colors">
                        {isBookingSubmitting ? <RefreshCw className="animate-spin" size={20}/> : <><Mail size={20}/> Send Booking Request</>}
                      </button>
                      <button onClick={() => setBookingStep(1)} className="w-full text-center text-xs font-bold text-gray-400 mt-4">Back</button>
                    </div>
                  ) : bookingStep === 3 ? (
                    <div className="bg-white p-10 md:p-14 rounded-[3rem] border border-[#F0E6D2] shadow-sm text-center flex flex-col items-center justify-center min-h-[400px] animate-in zoom-in duration-500">
                      <div className="w-20 h-20 bg-[#FFF9E5] text-[#C8A15E] rounded-full flex items-center justify-center mb-6 shadow-md border border-[#FFD88B]/30"><HeartIcon size={40} fill="currentColor" className="animate-bounce" /></div>
                      <h3 className="text-3xl font-serif font-bold text-[#2B4562] mb-4">Thank you for your request! ✨</h3>
                      <p className="text-gray-500 leading-relaxed max-w-md mx-auto mb-8">
                        We've received your booking request for <span className="font-bold text-[#2B4562]">{selectedDesign?.salon || 'salon'}</span>. <br/><br/>
                        Your booking request has been sent to <span className="font-bold text-[#2B4562]">nailoo.japan@gmail.com</span>.<br/> 
                        We will get back to you asap (up to 12 hours) with payment details!
                      </p>
                      <button onClick={() => { setView('home'); setBookingStep(1); window.scrollTo(0,0); }} className="bg-[#2B4562] text-white px-8 py-4 rounded-full font-bold shadow-md hover:bg-[#1A2E44] transition-colors">Back to Home</button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'about' && (
        <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto">
          <button onClick={() => setView('home')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#2B4562] mb-8 transition-colors"><ChevronLeft size={16} /> Back</button>
          <div className="bg-white rounded-[3rem] p-8 md:p-14 shadow-xl border border-[#F0E6D2] relative overflow-hidden">
            <BlobFill className="w-[600px] text-[#FFF9E5]/50 -top-20 -right-20 opacity-50" />
            <div className="relative z-10 space-y-12">
              <div className="text-center">
                <h2 className="text-4xl font-serif font-bold text-[#2B4562] mb-4">Our Story</h2>
                <p className="text-[#C8A15E] font-medium">Why we started Nailoo</p>
              </div>
              <div className="flex flex-col md:flex-row gap-10 items-start">
                <div className="w-48 h-48 md:w-64 md:h-64 shrink-0 rounded-full overflow-hidden border-4 border-[#FFF9E5] shadow-lg relative group cursor-pointer mx-auto md:mx-0">
                  <img src={founderImage || "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=400&auto=format&fit=crop"} alt="Founder Hana" className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                  <button onClick={() => founderFileInputRef.current?.click()} className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"><Upload size={24} className="mb-2" /><span className="text-xs font-bold">Change</span></button>
                  <input type="file" ref={founderFileInputRef} className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handleFounderImageUpload} />
                </div>
                <div className="space-y-6 text-gray-600 leading-relaxed text-sm">
                  <h3 className="text-2xl font-serif font-bold text-[#2B4562]">Hi, I'm Hana!</h3>
                  <p>
                    I believe that Japanese nail art is the best in the world. The attention to detail, the creativity, and the delicate techniques are truly exceptional.
                  </p>
                  <p>
                    However, I noticed that many international visitors give up on experiencing this because of the language barrier, the difficulty of making reservations on Japanese websites, and the uncertainty of whether they can get the design they want.
                  </p>
                  <p>
                    That's why I created Nailoo. My mission is to make it easy and stress-free for tourists to connect with amazing nail salons in Japan. I want to help you experience the incredible quality of Japanese nail art and create wonderful, unforgettable memories during your trip to Japan.
                  </p>
                  <p>
                    Let's make your Japan trip even cuter with Nailoo! 💅✨
                  </p>
                  <p className="font-serif font-bold text-[#C8A15E] pt-4 text-lg">Hana, Founder</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTermsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2B4562]/40 backdrop-blur-sm transition-all duration-300" onClick={() => setShowTermsModal(false)}>
          <div className="relative max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-[#F0E6D2] p-8 md:p-10 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowTermsModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-[#2B4562] transition-colors"><X size={24} /></button>
            <h2 className="text-2xl font-serif font-bold text-[#2B4562] mb-6">Terms and Conditions</h2>
            <div className="text-sm text-gray-600 space-y-5 leading-relaxed">
              <p>1. Cancellations made within 24 hours of the appointment may be subject to a cancellation fee.</p>
              <p>2. Payments are processed securely via Stripe. Your card will be charged upon confirmation.</p>
              <p>3. Nailoo acts as an intermediary platform connecting you with salons.</p>
            </div>
            <div className="mt-8 text-center">
              <button onClick={() => setShowTermsModal(false)} className="bg-[#2B4562] text-white px-10 py-3 rounded-full font-bold hover:bg-[#1a293b] transition-colors shadow-md">Close</button>
            </div>
          </div>
        </div>
      )}

      {enlargedImage && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 cursor-pointer transition-all duration-300 ${showImage ? 'bg-[#FFFDF7]/85 backdrop-blur-md opacity-100' : 'bg-transparent opacity-0'}`} onClick={closeImage}>
          <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center">
             <button onClick={(e) => { e.stopPropagation(); closeImage(); }} className={`absolute -top-12 right-0 md:-right-12 md:top-0 text-[#2B4562] bg-white border border-[#F0E6D2] rounded-full p-2 hover:bg-[#FFF9E5] hover:text-[#C8A15E] transition-all shadow-md z-10 duration-300 delay-100 ${showImage ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}><X size={24} /></button>
            <img src={enlargedImage} className={`max-w-full max-h-[85vh] object-contain rounded-[2rem] shadow-2xl transition-all duration-500 ${showImage ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-10 opacity-0'}`} style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }} alt="" onClick={(e) => e.stopPropagation()}/>
          </div>
        </div>
      )}

      {isUploadingImage && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#2B4562]/80 backdrop-blur-md transition-all duration-300 text-white text-center">
          <RefreshCw className="animate-spin text-[#C8A15E] mb-4" size={40} />
          <h3 className="font-serif font-bold text-xl mb-2">Uploading...💅</h3>
        </div>
      )}

      <footer className="py-12 border-t border-[#F0E6D2] bg-white text-center mt-20 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
        <p>© 2026 Nailoo. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;