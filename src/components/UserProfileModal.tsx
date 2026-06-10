import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Mail, Lock, Phone, MapPin, Camera, X, Check, Eye, EyeOff, Save, Upload, AlertCircle
} from 'lucide-react';
import { SessionUser } from '../types';
import { auth } from '../firebase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SessionUser;
  onUpdateProfile: (updatedUser: SessionUser) => void;
}


export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [password, setPassword] = useState(currentUser.password || '123');
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phoneNumber || '');
  const [city, setCity] = useState(currentUser.city || '');
  const [profilePic, setProfilePic] = useState(currentUser.profilePic || '');
  
  const [showPassword, setShowPassword] = useState(false);

  // Check if profile is tied to Google Provider
  const isGoogleUser = !!currentUser.isGoogleUser || 
                       auth.currentUser?.providerData.some(p => p.providerId === 'google.com') ||
                       (currentUser.email?.toLowerCase().endsWith('@gmail.com'));
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load latest values whenever currentUser or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhoneNumber(currentUser.phoneNumber || '');
      setCity(currentUser.city || '');
      setProfilePic(currentUser.profilePic || '');
      
      // Look up password in local registered users since it may not be in current session state
      const savedUsersRaw = localStorage.getItem('lib_registered_users');
      if (savedUsersRaw) {
        try {
          const customUsers = JSON.parse(savedUsersRaw);
          const matched = customUsers.find((u: any) => u.email.toLowerCase() === (currentUser.email || '').toLowerCase());
          if (matched && matched.password) {
            setPassword(matched.password);
          } else {
            setPassword(currentUser.password || '123');
          }
        } catch (e) {
          setPassword(currentUser.password || '123');
        }
      } else {
        setPassword(currentUser.password || '123');
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // File Upload Handler (converts to base64)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      showToast('error', 'La foto supera el límite de 2MB permitidos.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setProfilePic(reader.result);
        showToast('success', '¡Foto cargada exitosamente!');
      }
    };
    reader.readAsDataURL(file);
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'El nombre completo es requerido.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('error', 'Ingresa un correo electrónico válido.');
      return;
    }

    // Prepare updated user object
    const updatedUser: SessionUser = {
      ...currentUser,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      phoneNumber: phoneNumber.trim(),
      city: city.trim(),
      profilePic: profilePic
    };

    // Update global/local database of registered users
    const savedUsersRaw = localStorage.getItem('lib_registered_users');
    let customUsers = [];
    if (savedUsersRaw) {
      try {
        customUsers = JSON.parse(savedUsersRaw);
      } catch (err) {}
    }

    // Match by the original email, or search and replace/update
    const originalEmail = currentUser.email || '';
    const existingIndex = customUsers.findIndex((u: any) => u.email.toLowerCase() === originalEmail.toLowerCase());

    const userRecord = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      phoneNumber: phoneNumber.trim(),
      city: city.trim(),
      profilePic: profilePic
    };

    if (existingIndex > -1) {
      customUsers[existingIndex] = userRecord;
    } else {
      customUsers.push(userRecord);
    }

    localStorage.setItem('lib_registered_users', JSON.stringify(customUsers));

    // Callback to update parent session state
    onUpdateProfile(updatedUser);

    showToast('success', '¡Perfil actualizado exitosamente!');
    setTimeout(() => {
      onClose();
    }, 800);
  };

  // Check if profilePic is base64 photo vs preset prefix
  const isBase64OrUrl = profilePic.startsWith('data:') || profilePic.startsWith('http');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#FDFCF8] rounded-[32px] border border-[#d3cc9e] shadow-[0_24px_64px_rgba(140,137,121,0.15)] overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        
        {/* Banner/Header styled transparent/clean like start window */}
        <div className="pt-[8px] pb-2 pl-[30px] pr-[30px] flex justify-between items-center relative shrink-0 border-b border-[#E9E5D9]/50">
          <h3 className="font-sans text-[16px] font-extrabold text-[#5F6F52] tracking-normal">Editar Perfil</h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#FAF8F5] text-[#8C8979] hover:text-[#5F6F52] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSave} className="px-6 py-[20px] overflow-y-auto space-y-5 flex-1 text-natural-text font-sans">
          
          {/* Toast Notification inside dialog */}
          {toastMessage && (
            <div className={`p-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 animate-fade-in text-center w-full ${
              toastMessage.type === 'success' 
                ? 'bg-[#5F6F52] text-white border border-[#4E5C43]' 
                : 'bg-red-600 text-white border border-red-700'
            }`}>
              {toastMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-white shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-white shrink-0" />
              )}
              <span className="font-semibold text-center">{toastMessage.text}</span>
            </div>
          )}

          {/* Profile Picture & Preset Avatar Block */}
          <div className="flex flex-col items-center justify-center gap-4 p-0 bg-transparent border-0 text-center w-full mb-[10px]">
            {/* User Profile Circular Thumbnail */}
            <div className="relative group shrink-0">
              <div className="w-[72px] h-[72px] pb-0 mb-[6px] rounded-full overflow-hidden border-2 border-[#E1DEC9] bg-[#FAF8F2] flex items-center justify-center text-3xl shadow-xs">
                {profilePic ? (
                  isBase64OrUrl ? (
                    <img 
                      src={profilePic} 
                      alt="Perfil" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    // Emoji / avatar fallback
                    <span>{profilePic}</span>
                  )
                ) : (
                  <User className="w-10 h-10 text-[#8C8979]" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 bg-[#5F6F52] hover:bg-[#4E5C43] text-white rounded-full transition-all shadow-md cursor-pointer"
                title="Subir foto de perfil"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

          </div>

          {/* Core Registrant Information Fields */}
          <div className="space-y-4">

            {/* Full Names (Nombres Completos) */}
            <div className="space-y-1 mb-[10px]">
              <label className="text-[11px] font-bold text-[#5F6F52] block text-left w-full uppercase tracking-wider">Nombres Completos *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez Castro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-[#5F6F52] focus:ring-1 focus:ring-[#5F6F52] text-[13px] rounded-[16px] outline-none text-neutral-800 transition-all placeholder-[#908D7F] font-medium h-[40px] shadow-xs"
                />
              </div>
            </div>

            {/* Email Address (Correo electrónico) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 w-full">
                <label className="text-[11px] font-bold text-[#5F6F52] block text-left uppercase tracking-wider">Email *</label>
                {isGoogleUser && (
                  <span className="text-[11px] text-[#5F6F52]/80 font-bold text-left animate-fade-in">
                    Registrado con cuenta de Google
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="Ej. lector@gmail.com"
                  value={email}
                  disabled={isGoogleUser}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-2 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-[#5F6F52] focus:ring-1 focus:ring-[#5F6F52] text-[13px] rounded-[16px] outline-none text-neutral-800 transition-all placeholder-[#908D7F] font-medium h-[40px] shadow-xs ${isGoogleUser ? 'opacity-80 bg-stone-50 cursor-not-allowed select-none' : ''}`}
                />
              </div>
            </div>

            {/* Password (Contraseña) */}
            <div className="space-y-1 mb-[-15px]">
              <label className="text-[11px] font-bold text-[#5F6F52] block text-left w-full uppercase tracking-wider">Contraseña *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Contraseña de ingreso"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-[#5F6F52] focus:ring-1 focus:ring-[#5F6F52] text-[13px] rounded-[16px] outline-none text-neutral-800 transition-all placeholder-[#908D7F] font-medium h-[40px] shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C8979] hover:text-[#5F6F52] cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Optional Extended Profile Information */}
          <div className="space-y-4 pt-1 mb-[14px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone (Celular / Teléfono) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#5F6F52] uppercase tracking-wider block text-left w-full">Número de Celular</label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="Ej. +593 98 765 4321"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-[#5F6F52] focus:ring-1 focus:ring-[#5F6F52] text-[13px] rounded-[16px] outline-none text-neutral-800 transition-all placeholder-[#908D7F] font-medium h-[40px] shadow-xs"
                  />
                </div>
              </div>

              {/* City (Ciudad) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#5F6F52] uppercase tracking-wider block text-left w-full">Ciudad</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ej. Quito / Guayaquil"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-[#5F6F52] focus:ring-1 focus:ring-[#5F6F52] text-[13px] rounded-[16px] outline-none text-neutral-800 transition-all placeholder-[#908D7F] font-medium h-[40px] shadow-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-3 border-t border-[#E9E5D9]/60 shrink-0 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] text-[#7A7768] hover:text-[#5F6F52] text-xs font-extrabold rounded-[18px] transition-all cursor-pointer text-center h-[40px] flex items-center justify-center gap-1.5 font-sans"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-[#5F6F52] hover:bg-[#4E5C43] text-white text-xs font-extrabold rounded-[18px] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none h-[40px] font-sans"
            >
              <Save className="w-4 h-4 text-white" />
              Guardar
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
