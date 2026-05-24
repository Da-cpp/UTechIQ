import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import logo from '../assets/UtechLogo.png';
import { Shield, Calendar, Lock, User, GraduationCap, UserPlus, Loader2, ArrowRight, Mail } from 'lucide-react';
interface LoginProps {
  onLoginSuccess: () => void;
}

type AuthMode = 'student' | 'professor' | 'signup';

export default function Login({ onLoginSuccess }: LoginProps) {
  // Central UI Toggle Flow: 'student' | 'professor' | 'signup'
  const [authMode, setAuthMode] = useState<AuthMode>('student');
  
  // Form input field configurations
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [birthdate, setBirthdate] = useState(''); // Format: ddmmyy

  // Interface feedback status updates
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
        // -----------------------------
        // SIGN UP FLOW
        // -----------------------------
        if (authMode === 'signup') {

        const { data: authData, error: signUpError } =
            await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                birthdate,
                id_number: idNumber,
                full_name: fullName,
                role: 'student',
                },
            },
            });

        if (signUpError) throw signUpError;

        if (authData?.user) {

            const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                {
                id: authData.user.id,
                name: fullName || 'New User',
                role: 'student',
                id_number: idNumber || '',
                },
            ]);

            if (profileError) {
            console.error(profileError);
            throw profileError;
            }
        }

        setErrorMessage(
            'Registration complete! You can now log in.'
        );

        setAuthMode('student');

        } else {

        // -----------------------------
        // LOGIN FLOW
        // -----------------------------
        const { error: signInError } =
            await supabase.auth.signInWithPassword({
            email,
            password,
            });

        if (signInError) throw signInError;

        onLoginSuccess();
        }

    } catch (err: any) {

        setErrorMessage(
        err.message ||
        'An error occurred during authentication.'
        );

    } finally {
        setLoading(false);
    }
    };

  return (
    <div style={styles.container}>
      
      
      <div style={styles.logoContainer}>
        <img
            width={68}
            height={88}
            src={logo}
            alt="Project Logo"
            style={{ objectFit: 'contain' }}
        />
        </div>


      {/* 2. THREE-WAY VIEW INTERACTIVE TOGGLE STRIP SWITCH */}
      <div style={styles.toggleStrip}>
        <button
          type="button"
          onClick={() => { setAuthMode('student'); setErrorMessage(null); }}
          style={{ ...styles.toggleButton, ...(authMode === 'student' ? styles.activeToggle : {}) }}
        >
          <User size={14} />
          <span>Student Login</span>
        </button>
        
        <button
          type="button"
          onClick={() => { setAuthMode('professor'); setErrorMessage(null); }}
          style={{ ...styles.toggleButton, ...(authMode === 'professor' ? styles.activeToggle : {}) }}
        >
          <GraduationCap size={14} />
          <span>Professor Login</span>
        </button>
        
        <button
          type="button"
          onClick={() => { setAuthMode('signup'); setErrorMessage(null); }}
          style={{ ...styles.toggleButton, ...(authMode === 'signup' ? styles.activeToggle : {}) }}
        >
          <UserPlus size={14} />
          <span>Sign Up</span>
        </button>
      </div>

      {/* 3. THE SINGLE, CLEAN AUTHENTICATION CARD */}
      <div style={styles.authCard}>
        
        {errorMessage && (
          <div style={{
            ...styles.alert,
            backgroundColor: errorMessage.includes('complete') ? 'var(--accent-bg)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: errorMessage.includes('complete') ? 'var(--accent-border)' : 'rgba(239, 68, 68, 0.4)',
          }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          
          {/* --- VIEW 1: STUDENT INPUT FIELDS --- */}
          {authMode === 'student' && (
            <>
                <div style={styles.inputGroup}>
                <label style={styles.label}>
                    Student Email Address
                </label>

                <div style={styles.inputWrapper}>
                    <Mail size={16} style={styles.inputIcon} />

                    <input
                    type="email"
                    required
                    placeholder="student@students.utech.edu.jm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.inputField}
                    />
                </div>
                </div>
            </>
            )}

          {/* --- VIEW 2: PROFESSOR INPUT FIELDS --- */}
          {authMode === 'professor' && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Professor Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={16} style={styles.inputIcon} />
                <input
                  type="email"
                  required
                  placeholder="professor@utech.edu.jm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.inputField}
                />
              </div>
            </div>
          )}

          {/* --- VIEW 3: SIGN UP INPUT FIELDS --- */}
          {authMode === 'signup' && (
            <>
                <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name</label>

                <div style={styles.inputWrapper}>
                    <User size={16} style={styles.inputIcon} />

                    <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={styles.inputField}
                    />
                </div>
                </div>

                <div style={styles.inputGroup}>
                <label style={styles.label}>
                    Student Email Address
                </label>

                <div style={styles.inputWrapper}>
                    <Mail size={16} style={styles.inputIcon} />

                    <input
                    type="email"
                    required
                    placeholder="student@students.utech.edu.jm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.inputField}
                    />
                </div>
                </div>

                <div style={styles.inputGroup}>
                <label style={styles.label}>
                    Student ID Number
                </label>

                <div style={styles.inputWrapper}>
                    <Shield size={16} style={styles.inputIcon} />

                    <input
                    type="text"
                    required
                    placeholder="2205034"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    style={{
                        ...styles.inputField,
                        fontFamily: 'var(--mono)',
                    }}
                    />
                </div>
                </div>

                <div style={styles.inputGroup}>
                <label style={styles.label}>
                    Birthdate (ddmmyy)
                </label>

                <div style={styles.inputWrapper}>
                    <Calendar size={16} style={styles.inputIcon} />

                    <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="140802"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    style={{
                        ...styles.inputField,
                        fontFamily: 'var(--mono)',
                    }}
                    />
                </div>
                </div>
            </>
            )}
          {/* COMMON FIELD: PASSWORD REQUIRED BY ALL ACCESS TIERS */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.inputField}
              />
            </div>
          </div>

          {/* SUBMIT BUTTON AXIS */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              backgroundColor: loading ? 'var(--code-bg)' : 'var(--accent)',
              color: loading ? 'var(--text)' : '#fff',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>
                  {authMode === 'signup' ? 'Create Account Node' : 'Verify Credentials'}
                </span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}

// STYLING MAP ADAPTIVE MATRIX
const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 10px',
    background: 'var(--bg)',
    boxSizing: 'border-box',
  },
  logoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
    textAlign: 'center',
  },
  logoIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    backgroundColor: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    boxShadow: 'var(--shadow)',
  },
  logoTitle: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 4px 0',
    letterSpacing: '-0.5px',
  },
  logoSub: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: 'var(--text)',
    opacity: 0.8,
  },
  toggleStrip: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '4px',
    width: '100%',
    maxWidth: '460px',
    padding: '4px',
    backgroundColor: 'var(--code-bg)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    marginBottom: '20px',
    boxSizing: 'border-box',
  },
  toggleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 4px',
    fontSize: '12px',
    fontWeight: '600',

    backgroundColor: 'transparent',
    color: 'var(--text)',

    border: '1px solid transparent',
    borderRadius: '7px',

    cursor: 'pointer',
    fontFamily: 'var(--sans)',

    transition: 'all 0.15s ease',

    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    },
  activeToggle: {
    backgroundColor: 'var(--bg)',
    color: 'var(--accent)',
    boxShadow: 'var(--shadow)',
    border: '1px solid var(--border)',
    fontWeight: '700',
  },
  authCard: {
    width: '100%',
    maxWidth: '460px',
    padding: '22px',
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    boxShadow: 'var(--shadow)',
    textAlign: 'left',
    boxSizing: 'border-box',
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '13px',
    marginBottom: '24px',
    color: 'var(--text-h)',
    lineHeight: '145%',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: 'var(--text)',
    opacity: 0.6,
  },
  inputField: {
    width: '100%',
    padding: '13px 14px 13px 42px',
    fontSize: '14px',
    backgroundColor: 'var(--code-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-h)',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'var(--sans)',
    transition: 'border-color 0.2s ease',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '8px',
    marginTop: '8px',
    fontFamily: 'var(--sans)',
    transition: 'opacity 0.2s ease',
  },
};