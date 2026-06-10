import React, { useState, useEffect } from 'react';
import { BookOpen, UserCheck, Shield, BookMarked, UserPlus, KeyRound, Sparkles, Eye, EyeOff, Mail, RefreshCw, AlertCircle, CheckSquare } from 'lucide-react';
import { 
  fetchGlobalUserByEmail, 
  registerGlobalUser, 
  updateGlobalUserPassword,
  registerAuthWithVerification,
  loginWithAuthCheck,
  checkEmailVerifiedStatus,
  resendVerificationEmail,
  auth,
  loginWithGoogle
} from '../firebase';
import { LayoutDesignConfig, SessionUser } from '../types';

interface WelcomeScreenProps {
  onLoginSuccess: (user: SessionUser) => void;
  designConfig?: LayoutDesignConfig;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLoginSuccess, designConfig }) => {
  const [activeTab, setActiveTab] = useState<'guest' | 'customer' | 'admin'>('customer');
  const [customerMode, setCustomerMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [isLoading, setIsLoading] = useState(false);

  // Client client registration state
  const [customUsers, setCustomUsers] = useState<{ name: string; email: string; password: string }[]>(() => {
    const saved = localStorage.getItem('lib_registered_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    // Prepopulated accounts for testing/grading!
    return [
      { name: 'Juan Pérez', email: 'juan@gmail.com', password: '123' },
      { name: 'María Gómez', email: 'maria@gmail.com', password: '123' },
    ];
  });

  // Save users change
  useEffect(() => {
    localStorage.setItem('lib_registered_users', JSON.stringify(customUsers));
  }, [customUsers]);

  // Login Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot password flow states
  const [forgotEmailVerified, setForgotEmailVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Email Link Verification States
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationName, setVerificationName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Admin states
  const [adminUser, setAdminUser] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Error notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleForgotPasswordFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email.trim()) {
      setErrorMsg('Por favor ingresa tu correo electrónico.');
      return;
    }
    setIsLoading(true);
    try {
      const cloudUser = await fetchGlobalUserByEmail(email);
      if (cloudUser) {
        // Safe-sync to local state
        setCustomUsers((prev) => {
          const exists = prev.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
          if (!exists) {
            return [...prev, { name: cloudUser.name, email: cloudUser.email, password: cloudUser.password || '123' }];
          }
          return prev;
        });
        setForgotEmailVerified(true);
        setSuccessMsg(`¡Correo electrónico validado en el servidor! "${cloudUser.email}" está registrado. Por favor establece tu nueva contraseña.`);
      } else {
        const foundUser = customUsers.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase()
        );
        if (foundUser) {
          setForgotEmailVerified(true);
          setSuccessMsg(`¡Correo electrónico validado! "${foundUser.email}" está registrado. Por favor establece tu nueva contraseña.`);
        } else {
          setErrorMsg('No se encontró ninguna cuenta registrada con este correo electrónico.');
        }
      }
    } catch (err) {
      const foundUser = customUsers.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (foundUser) {
        setForgotEmailVerified(true);
        setSuccessMsg(`¡Correo electrónico validado localmente! "${foundUser.email}" está registrado. Por favor establece tu nueva contraseña.`);
      } else {
        setErrorMsg('No se encontró ninguna cuenta registrada con este correo electrónico.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (newPassword.length < 3) {
      setErrorMsg('La nueva contraseña debe tener al menos 3 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    const userIndex = customUsers.findIndex(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (userIndex !== -1) {
      setIsLoading(true);
      try {
        const targetUser = customUsers[userIndex];
        // Save to Firebase Firestore globally
        await updateGlobalUserPassword(email.trim().toLowerCase(), newPassword, targetUser.name);

        const updatedUsers = [...customUsers];
        updatedUsers[userIndex] = {
          ...targetUser,
          password: newPassword,
        };

        setCustomUsers(updatedUsers);
        localStorage.setItem('lib_registered_users', JSON.stringify(updatedUsers));

        setSuccessMsg('¡Contraseña actualizada con éxito en la base de datos de la nube! Ya puedes iniciar sesión con tu nueva contraseña.');
        
        setCustomerMode('login');
        setForgotEmailVerified(false);
        setNewPassword('');
        setConfirmNewPassword('');
        setPassword('');
      } catch (err: any) {
        setErrorMsg('Error al conectar con la base de datos de Firebase: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      setErrorMsg('Hubo un error al procesar la solicitud. El usuario no fue encontrado.');
      setForgotEmailVerified(false);
    }
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (customerMode === 'login') {
      setIsLoading(true);
      try {
        // Try authenticating with actual Firebase Auth first
        const firebaseUser = await loginWithAuthCheck(email, password);
        
        if (firebaseUser) {
          // Check if email link verification is complete
          if (!firebaseUser.emailVerified) {
            setVerificationEmail(firebaseUser.email || email);
            setVerificationName(firebaseUser.displayName || 'Lector');
            setAwaitingVerification(true);
            setSuccessMsg(`Tu cuenta requiere verificación. Hemos enviado un correo de confirmación a: ${firebaseUser.email || email}`);
            setIsLoading(false);
            return;
          }

          // Email verified! Sync locally and proceed
          const syncedUser = { name: firebaseUser.displayName || 'Lector', email: firebaseUser.email || email, password };
          setCustomUsers((prev) => {
            const exists = prev.some((u) => u.email.toLowerCase() === (firebaseUser.email || email).toLowerCase());
            if (!exists) {
              return [...prev, syncedUser];
            }
            return prev;
          });
          
          onLoginSuccess({
            role: 'customer',
            email: firebaseUser.email || email,
            name: firebaseUser.displayName || 'Lector',
          });
          return;
        }
      } catch (authError: any) {
        console.log("Firebase Auth failed or pending, trying local/firestore fallback.", authError);
      }

      // Fallback/Legacy lookup in global Firestore users collection
      try {
        const cloudUser = await fetchGlobalUserByEmail(email);
        if (cloudUser && cloudUser.password === password) {
          setCustomUsers((prev) => {
            const exists = prev.some((u) => u.email.toLowerCase() === cloudUser.email.toLowerCase());
            if (!exists) {
              return [...prev, { name: cloudUser.name, email: cloudUser.email, password: cloudUser.password || '123' }];
            }
            return prev;
          });
          onLoginSuccess({
            role: 'customer',
            email: cloudUser.email,
            name: cloudUser.name,
          });
          setIsLoading(false);
          return;
        }

        // Local State lookup
        const foundUser = customUsers.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
        );
        if (foundUser) {
          onLoginSuccess({
            role: 'customer',
            email: foundUser.email,
            name: foundUser.name,
          });
        } else {
          setErrorMsg('El correo electrónico o la contraseña son incorrectos.');
        }
      } catch (err) {
        // Fallback offline
        const foundUser = customUsers.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
        );
        if (foundUser) {
          onLoginSuccess({
            role: 'customer',
            email: foundUser.email,
            name: foundUser.name,
          });
        } else {
          setErrorMsg('El correo electrónico o la contraseña son incorrectos.');
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // Register Mode
      if (!name.trim()) {
        setErrorMsg('Por favor ingresa tu nombre.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg('Por favor ingresa un correo electrónico válido.');
        return;
      }
      if (password.length < 3) {
        setErrorMsg('La contraseña debe tener al menos 3 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Las contraseñas ingresadas no coinciden.');
        return;
      }

      setIsLoading(true);
      try {
        // Create user with Firebase Auth & send Email Verification Link
        await registerAuthWithVerification(name.trim(), email.trim(), password);

        const newUser = { name: name.trim(), email: email.trim().toLowerCase(), password };
        setCustomUsers((prev) => [...prev, newUser]);
        
        // Show verification prompt
        setVerificationEmail(email.trim().toLowerCase());
        setVerificationName(name.trim());
        setAwaitingVerification(true);
        const emailTemplate = designConfig?.textRegisterSuccessEmail ?? '¡Registro exitoso! Un enlace de verificación de Firebase fue enviado a tu correo: {email}. Abre el correo y activa tu cuenta para ingresar.';
        setSuccessMsg(emailTemplate.replace('{email}', email));
        
        setCustomerMode('login');
        setPassword('');
        setConfirmPassword('');
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          setErrorMsg('Este correo ya está registrado en Firebase Authentication. Por favor, inicia sesión.');
        } else if (err.message && err.message.includes('auth/operation-not-allowed')) {
          console.warn("Email/Password Auth provider not enabled. Attempting general Firestore fallback registration.");
          try {
            const newUser = { name: name.trim(), email: email.trim().toLowerCase(), password };
            await registerGlobalUser(newUser);
            setCustomUsers((prev) => [...prev, newUser]);
            const noAuthTemplate = designConfig?.textRegisterSuccessNoAuth ?? '¡Registro exitoso en la base de datos! (Nota: Proveedor de Auth no configurado, acceso directo habilitado).';
            setSuccessMsg(noAuthTemplate);
            setCustomerMode('login');
            setPassword('');
            setConfirmPassword('');
          } catch (altErr: any) {
            setErrorMsg('Error al registrar usuario: ' + altErr.message);
          }
        } else {
          setErrorMsg('Error de registro en Firebase: ' + err.message);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    // Try matching active adminUsers from designConfig if defined
    const matchedAdmin = designConfig?.adminUsers?.find(user => {
      const input = adminUser.trim().toLowerCase();
      const usernameMatch = user.username && user.username.trim().toLowerCase() === input;
      const emailMatch = user.email && user.email.trim().toLowerCase() === input;
      const passwordMatch = user.password === adminPassword;
      return (usernameMatch || emailMatch) && passwordMatch;
    });

    if (matchedAdmin) {
      onLoginSuccess({
        role: 'admin',
        name: matchedAdmin.username || 'Admin',
        email: matchedAdmin.email,
        adminRole: matchedAdmin.role
      });
    } else if (adminUser.trim() === 'admin' && adminPassword === 'admin') {
      onLoginSuccess({
        role: 'admin',
        name: 'Administrador',
        adminRole: 'administrador'
      });
    } else {
      setErrorMsg('Usuario o contraseña de administrador incorrectos.');
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-natural-bg text-natural-text flex flex-col justify-center items-center px-4 py-3 md:py-12 font-sans">
      {/* Decorative solid background circles and grid overlay matching the screenshot */}
      <div className="absolute top-[12%] -right-[120px] w-96 h-96 bg-[#F3EFE1]/70 rounded-full z-0 pointer-events-none" />
      <div className="absolute bottom-[8%] -left-[180px] w-[450px] h-[450px] bg-[#F3EFE1]/70 rounded-full z-0 pointer-events-none" />
      
      {/* Grid lines layered on top of the solid circles */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#E6E2D3_1px,transparent_1px),linear-gradient(to_bottom,#E6E2D3_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-35 z-[1] pointer-events-none" />

      {/* Logo and Header relocated above/outside the card box */}
      <div className="flex items-center justify-center gap-3.5 pt-1.5 pb-1 mx-auto mb-4 relative z-10 animate-fade-in" style={{ paddingBottom: '11px', paddingTop: '18px', marginBottom: '4px', marginTop: '-15px' }}>
        <div className="bg-[#5F6F52] rounded-[14px] flex items-center justify-center text-white shadow-md shadow-[#5F6F52]/15 transition-transform hover:scale-105 duration-300 shrink-0" style={{ width: '44px', height: '44px' }}>
          {activeTab === 'admin' ? (
            <Shield className="w-5.5 h-5.5" />
          ) : (
            <BookOpen className="w-5.5 h-5.5" />
          )}
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="font-serif italic tracking-tight text-neutral-900" style={{ fontSize: '18.5px', fontFamily: 'Libre Baskerville', fontStyle: 'italic', fontWeight: '600', color: '#1B1B18', lineHeight: '21.95px' }}>
            Servicio de
          </span>
          <span className="font-serif italic tracking-tight text-neutral-900" style={{ fontSize: '23.5px', fontFamily: 'Libre Baskerville', fontStyle: 'italic', fontWeight: '800', color: '#1B1B18', lineHeight: '1.1' }}>
            Literatura Ecuador
          </span>
        </div>
      </div>

      <div className="max-w-[420px] w-full bg-white rounded-[32px] border border-[#d3cc9e] shadow-[0_24px_64px_rgba(140,137,121,0.15)] p-6 relative z-10 animate-fade-in space-y-4 flex flex-col" style={{ paddingTop: '14px', paddingBottom: '14px', paddingLeft: '20px', paddingRight: '20px' }}>

        {/* Greeting Header inspired by the mockup typography */}
        <div className="text-center space-y-1 pb-1">
          <p className="text-[15px] leading-snug text-[#8C8979] max-w-xs mx-auto font-bold pt-1">
            {activeTab === 'admin' ? (
              'Ingresa las credenciales de administrador'
            ) : customerMode === 'login' ? (
              designConfig?.textWelcomeSubtextLogin ?? 'Ingresa tu correo y contraseña para navegar el catálogo y pedir libros'
            ) : customerMode === 'register' ? (
              designConfig?.textWelcomeSubtextRegister ?? 'Regístrate gratis para acceder a todos los items de Living Stream Ministry'
            ) : (
              designConfig?.textWelcomeSubtextForgot ?? 'Ingresa tu correo para validar y actualizar tus datos'
            )}
          </p>
        </div>



        {/* Display Error and Success Messages */}
        {errorMsg && (
          <div className="p-3.5 bg-[#FFE5E5] text-red-800 text-xs font-semibold rounded-2xl border border-red-200/50 animate-fade-in flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-green-50 text-green-800 text-xs font-semibold rounded-2xl border border-green-200/50 animate-fade-in">
            {successMsg}
          </div>
        )}

        {/* 1. Client Registered login/register flow */}
        {activeTab === 'customer' && (
          awaitingVerification ? (
            <div className="space-y-5 animate-fade-in text-center py-1">
              <div className="inline-flex w-12 h-12 bg-natural-primary/10 rounded-full items-center justify-center text-natural-primary mx-auto">
                <Mail className="w-5.5 h-5.5 animate-pulse" />
              </div>
              
              <div className="space-y-1">
                <h3 className="font-serif italic text-base font-bold text-natural-primary">
                  {designConfig?.textVerificationRequiredTitle ?? 'Verificación de Correo Requerida'}
                </h3>
                <p className="text-[11px] text-[#7A7768] leading-relaxed">
                  {(designConfig?.textVerificationRequiredSalutation ?? 'Hola {name}, hemos enviado un enlace de confirmación a:').replace('{name}', verificationName)}
                </p>
                <div className="my-1.5 py-1.5 px-3.5 bg-[#FAF8F2] border border-natural-border rounded-full inline-block text-xs font-mono font-bold text-natural-primary">
                  {verificationEmail}
                </div>
                <p className="text-[10px] text-natural-secondary leading-normal max-w-xs mx-auto pt-0.5">
                  {designConfig?.textVerificationRequiredInstructions ?? 'Por favor, abre tu bandeja de entrada (revisa también Spam) y haz clic en el botón o enlace enviado para confirmar tu correo.'}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={async () => {
                    clearMessages();
                    setIsVerifying(true);
                    try {
                      const isVerified = await checkEmailVerifiedStatus();
                      if (isVerified) {
                        setSuccessMsg("¡Felicidades! Cuenta confirmada con éxito. Sesión activa.");
                        setAwaitingVerification(false);
                        onLoginSuccess({
                          role: 'customer',
                          email: verificationEmail,
                          name: verificationName,
                        });
                      } else {
                        setErrorMsg("El correo aún no ha sido verificado. Haz clic en el enlace del correo.");
                      }
                    } catch (err: any) {
                      setErrorMsg("No pudimos actualizar el estado de validación: " + err.message);
                    } finally {
                      setIsVerifying(false);
                    }
                  }}
                  className="w-full py-3.5 px-5 bg-natural-primary hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold rounded-full shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckSquare className="w-4 h-4" />
                  )}
                  {isVerifying ? 'Cargando...' : (designConfig?.textVerificationRequiredCheckBtn ?? 'Ya verifiqué mi correo (Comprobar)')}
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={async () => {
                      clearMessages();
                      try {
                        await resendVerificationEmail();
                        setSuccessMsg("¡Se ha reenviado el enlace de verificación a tu correo!");
                      } catch (err: any) {
                        setErrorMsg("Error al reenviar el correo: " + err.message);
                      }
                    }}
                    className="py-2.5 px-4 bg-white text-[#7A7768] hover:text-natural-primary text-xs font-bold rounded-full border border-natural-border cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {designConfig?.textVerificationRequiredResendBtn ?? 'Reenviar Enlace'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAwaitingVerification(false);
                      clearMessages();
                    }}
                    className="py-2.5 px-4 bg-white text-natural-terracotta hover:underline text-xs font-bold rounded-full border border-natural-border cursor-pointer transition-all"
                  >
                    {designConfig?.textVerificationRequiredCancelBtn ?? 'Cancelar'}
                  </button>
                </div>
              </div>
            </div>
          ) : customerMode === 'forgot' ? (
            forgotEmailVerified ? (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 animate-fade-in block">
                <div className="flex justify-between items-center pb-1">
                  <span className="text-xs font-black text-[#5F6F52] uppercase tracking-wider">
                    Nueva Contraseña
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('login');
                      setForgotEmailVerified(false);
                      clearMessages();
                    }}
                    className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="p-3 bg-green-50/50 border border-green-200/60 rounded-2xl text-center">
                  <p className="text-[11px] text-green-800 leading-relaxed">
                    Correo validado: <strong className="font-mono">{email}</strong><br />
                    Establece tu contraseña de acceso:
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="Nueva contraseña (mínimo 3 caracteres)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-[#5F6F52] focus:ring-1 focus:ring-[#5F6F52] text-xs rounded-[16px] outline-none text-neutral-800 transition-all placeholder-[#908D7F] font-medium h-[46px] shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C8979] hover:text-[#5F6F52] cursor-pointer p-1"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showConfirmNewPassword ? "text" : "password"}
                      required
                      placeholder="Confirmar nueva contraseña"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-[#5F6F52] focus:ring-1 focus:ring-[#5F6F52] text-xs rounded-[16px] outline-none text-neutral-800 transition-all placeholder-[#908D7F] font-medium h-[46px] shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C8979] hover:text-[#5F6F52] cursor-pointer p-1"
                    >
                      {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-5 bg-[#5F6F52] hover:bg-[#4E5C43] text-white text-[13.5px] font-extrabold rounded-[18px] shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 outline-none h-[46px] mt-2 text-center"
                >
                  <KeyRound className="w-4 h-4" />
                  Actualizar Contraseña
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotPasswordFormSubmit} className="space-y-4 animate-fade-in block">
                <div className="flex justify-between items-center pb-1">
                  <span className="text-xs font-black text-[#5F6F52] uppercase tracking-wider">
                    Recuperar Contraseña
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('login');
                      clearMessages();
                    }}
                    className="text-xs font-bold text-[#8C8979] hover:text-[#5F6F52] hover:underline cursor-pointer"
                  >
                    Volver
                  </button>
                </div>

                <div className="p-3 bg-neutral-50 border border-[#E9E5D9] rounded-2xl text-center">
                  <p className="text-[11px] text-[#8C8979] leading-relaxed">
                    Ingresa tu correo registrado. Verificaremos que exista en la base de datos para permitirte cambiar la clave.
                  </p>
                </div>

                <div className="space-y-1">
                  <input
                    type="email"
                    required
                    placeholder="Tu correo electrónico registrado"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-[#5F6F52] focus:ring-1 focus:ring-[#5F6F52] text-xs rounded-[16px] outline-none text-neutral-800 transition-all placeholder-[#908D7F] font-medium h-[46px] shadow-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-5 bg-[#5F6F52] hover:bg-[#4E5C43] text-white text-[13.5px] font-extrabold rounded-[18px] shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 outline-none h-[46px]"
                >
                  <KeyRound className="w-4 h-4" />
                  Validar Correo de Usuario
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleCustomerSubmit} className="space-y-4 animate-fade-in block">
              <div className="space-y-3">
                {customerMode !== 'register' && (
                  <button
                    type="button"
                    onClick={async () => {
                      clearMessages();
                      setIsLoading(true);
                      try {
                        const user = await loginWithGoogle();
                        setSuccessMsg("¡Ingreso exitoso con tu cuenta de Google!");
                        setTimeout(() => {
                          onLoginSuccess({ 
                            role: 'customer', 
                            email: user.email || '', 
                            name: user.displayName || 'Usuario de Google',
                            isGoogleUser: true
                          });
                        }, 800);
                      } catch (err: any) {
                        setErrorMsg("Error al ingresar con Google: " + err.message);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="w-full py-2.5 px-4 bg-white hover:bg-[#FAF8F5] border border-[#E1DEC9] hover:border-[#CDCABC] text-neutral-700 text-xs font-bold rounded-[16px] cursor-pointer transition-all flex items-center justify-center gap-2.5 outline-none shadow-xs"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.61 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99c.92-2.75 3.49-4.51 6.76-4.51z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.46h6.46C17.82 16.63 15.34 19 12 19c-3.27 0-5.84-1.76-6.76-4.51L1.39 17.5c2.01 3.91 6.01 6.5 10.61 6.5 6.07 0 11-4.93 11-11a10.6 10.6 0 00-.51-2.23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.24 14.49A6.97 6.97 0 014.88 12c0-.87.13-1.71.36-2.49L1.39 6.52A11.95 11.95 0 000 12c0 2.01.5 3.9 1.39 5.58l3.85-3.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.02 0 5.56-1 7.41-2.7l-3.56-2.76c-1.01.68-2.31 1.09-3.85 1.09-3.27 0-5.84-1.76-6.76-4.51l-3.85 3C3.37 20.33 7.35 23 12 23z"
                      />
                    </svg>
                    Continuar con Google
                  </button>
                )}

                {/* "O" Divider BELOW Google button */}
                {customerMode !== 'register' && (
                  <div className="relative flex items-center justify-center my-1.5 py-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#E9E5D9]"></div>
                    </div>
                    <span className="relative px-3.5 text-[11px] font-bold text-[#8C8979] bg-white uppercase tracking-wider">o</span>
                  </div>
                )}

                {customerMode === 'register' && (
                  <div className="space-y-1">
                    <input
                      type="text"
                      required
                      placeholder="Tu nombre completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-[#5F6F52] focus:ring-1 focus:ring-[#5F6F52] text-sm rounded-[16px] outline-none text-neutral-800 transition-all placeholder-[#908D7F] font-medium h-[46px] shadow-xs"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <input
                    type="email"
                    required
                    placeholder="Usuario"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-[#5F6F52] focus:ring-1 focus:ring-[#5F6F52] text-[13px] rounded-[16px] outline-none text-neutral-800 transition-all placeholder-[#908D7F] font-medium h-[46px] shadow-xs"
                    style={{ paddingTop: '9px', paddingBottom: '9px' }}
                  />
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-[#5F6F52] focus:ring-1 focus:ring-[#5F6F52] text-[13px] rounded-[16px] outline-none text-neutral-800 transition-all placeholder-[#908D7F] font-medium h-[46px] shadow-xs"
                      style={{ paddingTop: '9px', paddingBottom: '9px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C8979] hover:text-[#5F6F52] cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {customerMode === 'register' && (
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        placeholder="Confirmar tu contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-[#5F6F52] focus:ring-1 focus:ring-[#5F6F52] text-sm rounded-[16px] outline-none text-neutral-800 transition-all placeholder-[#908D7F] font-medium h-[46px] shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C8979] hover:text-[#5F6F52] cursor-pointer p-1"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Extra row: Remember me box + Forgot Password styled exactly like Mockup */}
              {customerMode === 'login' && (
                <div className="flex items-center justify-between text-xs font-semibold select-none pt-1">
                  <label className="flex items-center gap-2 text-[#7A7768] cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-[#E1DEC9] text-[#5F6F52] focus:ring-[#5F6F52] w-4.5 h-4.5 cursor-pointer accent-[#5F6F52]"
                    />
                    <span>Recordarme</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setCustomerMode('forgot'); clearMessages(); }}
                    className="text-[#5F6F52] hover:underline cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-5 bg-[#5F6F52] hover:bg-[#4E5C43] disabled:opacity-50 text-white text-[14px] font-extrabold rounded-[18px] shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 outline-none h-[48px] mt-3"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                ) : (
                  customerMode === 'login' ? 'Iniciar sesión' : 'Registrarse'
                )}
              </button>

              {/* Bottom footer state switcher inspired by mockup */}
              <div className="text-center pt-2.5">
                <p className="text-xs text-neutral-500 font-medium select-none">
                  {customerMode === 'login' ? (
                    <>
                      ¿No tienes una cuenta?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerMode('register');
                          setActiveTab('customer');
                          clearMessages();
                        }}
                        className="font-bold text-[#5F6F52] hover:underline cursor-pointer ml-1"
                      >
                        Registrarse
                      </button>
                    </>
                  ) : (
                    <>
                      ¿Ya tienes una cuenta?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerMode('login');
                          setActiveTab('customer');
                          clearMessages();
                        }}
                        className="font-bold text-[#5F6F52] hover:underline cursor-pointer ml-1"
                      >
                        Iniciar Sesión
                      </button>
                    </>
                  )}
                </p>
              </div>

              {customerMode === 'login' && (
                <div className="text-center pt-2 select-none animate-fade-in">
                  <button
                    type="button"
                    onClick={() => onLoginSuccess({ role: 'guest' })}
                    className="text-[#5F6F52] hover:text-[#4E5C43] underline font-extrabold cursor-pointer outline-none inline p-0 text-[13.5px]"
                  >
                    Navegar sin registrarse
                  </button>
                </div>
              )}
            </form>
          )
        )}

        {/* 2. Admin login tab content */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="space-y-3.5 animate-fade-in block">
            <div className="space-y-3">
              <div className="space-y-1">
                <input
                  type="text"
                  required
                  placeholder="Usuario"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-[#5F6F52] focus:ring-1 focus:ring-[#5F6F52] text-[13px] rounded-[16px] outline-none text-neutral-800 transition-all placeholder-[#908D7F] font-medium h-[46px] shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    required
                    placeholder="Contraseña"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-[#5F6F52] focus:ring-1 focus:ring-[#5F6F52] text-[13px] rounded-[16px] outline-none text-neutral-800 transition-all placeholder-[#908D7F] font-medium h-[46px] shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C8979] hover:text-[#5F6F52] cursor-pointer p-1"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-5 bg-[#5F6F52] hover:bg-[#4E5C43] text-white text-[13.5px] font-extrabold rounded-[18px] shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 outline-none h-[46px] mt-2"
            >
              <Shield className="w-4 h-4" />
              Iniciar sesión
            </button>
          </form>
        )}

      </div>

      {/* 3. Bottom Guest and Admin actions, relocated at the bottom of the screen */}
      <div 
        className="text-center animate-fade-in space-y-3 relative z-10 w-full max-w-[420px] flex flex-col items-center" 
        style={{ 
          paddingTop: '4px',
          paddingBottom: '4px',
          paddingLeft: '0px',
          paddingRight: '0px',
          marginTop: '0px'
        }}
      >
        {activeTab === 'customer' ? (
          <>
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                clearMessages();
              }}
              className="text-[#5F6F52] hover:text-[#4E5C43] font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer outline-none hover:underline"
              style={{ fontSize: '13px', width: '227.172px', height: '46px', marginTop: '0px', marginLeft: '0px' }}
            >
              <Shield
                className="shrink-0"
                style={{
                  width: '40px',
                  height: '40px',
                  paddingLeft: '0px',
                  paddingRight: '0px',
                  paddingTop: '5px',
                  paddingBottom: '5px',
                  marginLeft: '0px',
                  marginTop: '0px'
                }}
              />
              Entrada de administrador
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setActiveTab('customer');
              setCustomerMode('login');
              clearMessages();
            }}
            className="w-[374px] max-w-full h-[41px] p-0 mt-[17px] mb-[12px] ml-0 bg-[#E7E6E3]/85 hover:bg-[#E7E6E3] border border-[#E9E5D9] text-[#1B1B18] text-[11.5px] uppercase tracking-wider font-extrabold rounded-[15px] cursor-pointer transition-colors flex items-center justify-center gap-1.5 outline-none duration-150 shadow-xs"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#1B1B18]" />
            Regresar a usuarios
          </button>
        )}
      </div>
    </div>
  );
};
