import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import logo from '../assets/UtechLogo.png';
import {
  Shield, Calendar, Lock, User, GraduationCap,
  UserPlus, Loader2, ArrowRight, Mail,
} from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

type AuthMode = 'student' | 'professor' | 'signup';

// Invite code validation states
type InviteStatus = 'idle' | 'checking' | 'valid' | 'invalid';

export default function Login({ onLoginSuccess }: LoginProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('student');

  // Shared fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Signup-only fields
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [middleNames, setMiddleNames] = useState('');
  const [idNumber, setIdNumber]       = useState('');
  const [birthdate, setBirthdate]     = useState(''); // ddmmyy
  const [inviteCode, setInviteCode]   = useState('');

  // Invite code lookup state
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>('idle');
  const [isValidProfessor, setIsValidProfessor] = useState(false);

  const [loading, setLoading]             = useState(false);
  const [errorMessage, setErrorMessage]   = useState<string | null>(null);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const emailPlaceholder = isValidProfessor
    ? 'professor@utech.edu.jm'
    : 'student@students.utech.edu.jm';

  const idPlaceholder = isValidProfessor ? 'P2010001' : '20210001';

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setErrorMessage(null);
    setInviteStatus('idle');
    setIsValidProfessor(false);
    setInviteCode('');
  };

  // ─── Invite code lookup (fires onBlur) ────────────────────────────────────

  const handleInviteCodeBlur = async () => {
    const code = inviteCode.trim();
    if (!code) {
      setInviteStatus('idle');
      setIsValidProfessor(false);
      return;
    }

    setInviteStatus('checking');

    try {
      const { data, error } = await supabase
        .from('professors')
        .select('professor_id')
        .eq('invite_code', code)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setInviteStatus('valid');
        setIsValidProfessor(true);
      } else {
        setInviteStatus('invalid');
        setIsValidProfessor(false);
        setErrorMessage('That invite code doesn\'t match any professor record. Leave it blank to sign up as a student.');
      }
    } catch (err) {
      setInviteStatus('idle');
      setIsValidProfessor(false);
    }
  };

  // ─── Pre-signup ID validation ──────────────────────────────────────────────

  /**
   * Confirms the entered ID exists in the relevant table before creating
   * an auth account. This ensures the trigger can link user_id successfully.
   */
  const validateIdExists = async (id: string, role: 'student' | 'professor'): Promise<boolean> => {
    if (role === 'student') {
      const { data } = await supabase
        .from('students')
        .select('student_id')
        .eq('student_id', id)
        .maybeSingle();
      return !!data;
    } else {
      const { data } = await supabase
        .from('professors')
        .select('professor_id')
        .eq('professor_id', id)
        .maybeSingle();
      return !!data;
    }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (authMode === 'signup') {
        const determinedRole: 'student' | 'professor' = isValidProfessor ? 'professor' : 'student';
        const trimmedId = idNumber.trim();

        // Validate ID exists before creating auth account
        const idExists = await validateIdExists(trimmedId, determinedRole);
        if (!idExists) {
          const label = determinedRole === 'professor' ? 'Professor ID' : 'Student ID';
          throw new Error(
            `${label} "${trimmedId}" was not found in our records. ` +
            `Please double-check your ID number and try again.`
          );
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name:   firstName.trim(),
              last_name:    lastName.trim(),
              middle_names: middleNames.trim() || null,
              birthdate,
              id_number:    trimmedId,
              role:         determinedRole,
            },
          },
        });

        if (signUpError) throw signUpError;

        setErrorMessage('Registration complete! You can now log in.');
        switchMode('student');

      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        onLoginSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

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

      <div style={styles.toggleStrip}>
        <button
          type="button"
          onClick={() => switchMode('student')}
          style={{ ...styles.toggleButton, ...(authMode === 'student' ? styles.activeToggle : {}) }}
        >
          <User size={14} />
          <span>Student Login</span>
        </button>

        <button
          type="button"
          onClick={() => switchMode('professor')}
          style={{ ...styles.toggleButton, ...(authMode === 'professor' ? styles.activeToggle : {}) }}
        >
          <GraduationCap size={14} />
          <span>Professor Login</span>
        </button>

        <button
          type="button"
          onClick={() => switchMode('signup')}
          style={{ ...styles.toggleButton, ...(authMode === 'signup' ? styles.activeToggle : {}) }}
        >
          <UserPlus size={14} />
          <span>Sign Up</span>
        </button>
      </div>

      <div style={styles.authCard}>
        {errorMessage && (
          <div style={{
            ...styles.alert,
            backgroundColor: errorMessage.includes('complete') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderColor:     errorMessage.includes('complete') ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
          }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>

          {/* ── Login email fields ── */}
          {authMode === 'student' && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Student Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={16} style={styles.inputIcon} />
                <input
                  type="email" required
                  placeholder="student@students.utech.edu.jm"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  style={styles.inputField}
                />
              </div>
            </div>
          )}

          {authMode === 'professor' && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Professor Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={16} style={styles.inputIcon} />
                <input
                  type="email" required
                  placeholder="professor@utech.edu.jm"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  style={styles.inputField}
                />
              </div>
            </div>
          )}

          {/* ── Signup fields ── */}
          {authMode === 'signup' && (
            <>
              {/* Invite code first — so the fields below can react to it */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Professor Invite Code{' '}
                  <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.6 }}>(optional)</span>
                </label>
                <div style={styles.inputWrapper}>
                  <Lock size={16} style={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Leave blank if signing up as a student"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value);
                      // Reset status when user edits the field
                      setInviteStatus('idle');
                      setIsValidProfessor(false);
                    }}
                    onBlur={handleInviteCodeBlur}
                    style={{
                      ...styles.inputField,
                      borderColor: inviteStatus === 'valid'
                        ? 'rgba(16,185,129,0.6)'
                        : inviteStatus === 'invalid'
                          ? 'rgba(239,68,68,0.6)'
                          : undefined,
                    }}
                  />
                  {inviteStatus === 'checking' && (
                    <Loader2 size={14} style={{ position: 'absolute', right: 14, opacity: 0.5 }} />
                  )}
                </div>
                {inviteStatus === 'valid' && (
                  <span style={styles.fieldHint}>
                    ✓ Valid professor code — signing up as a professor
                  </span>
                )}
              </div>

              {/* Name fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>First Name</label>
                  <div style={styles.inputWrapper}>
                    <User size={16} style={styles.inputIcon} />
                    <input
                      type="text" required
                      placeholder="Jane"
                      value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      style={styles.inputField}
                    />
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Last Name</label>
                  <div style={styles.inputWrapper}>
                    <User size={16} style={styles.inputIcon} />
                    <input
                      type="text" required
                      placeholder="Doe"
                      value={lastName} onChange={(e) => setLastName(e.target.value)}
                      style={styles.inputField}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Middle Name(s){' '}
                  <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.6 }}>(optional)</span>
                </label>
                <div style={styles.inputWrapper}>
                  <User size={16} style={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Ann Marie"
                    value={middleNames} onChange={(e) => setMiddleNames(e.target.value)}
                    style={styles.inputField}
                  />
                </div>
              </div>

              {/* Email — placeholder updates based on invite code */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <div style={styles.inputWrapper}>
                  <Mail size={16} style={styles.inputIcon} />
                  <input
                    type="email" required
                    placeholder={emailPlaceholder}
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    style={styles.inputField}
                  />
                </div>
              </div>

              {/* ID number — placeholder updates based on invite code */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  {isValidProfessor ? 'Professor ID' : 'Student ID'}
                </label>
                <div style={styles.inputWrapper}>
                  <Shield size={16} style={styles.inputIcon} />
                  <input
                    type="text" required
                    placeholder={idPlaceholder}
                    value={idNumber} onChange={(e) => setIdNumber(e.target.value)}
                    style={{ ...styles.inputField, fontFamily: 'var(--mono)' }}
                  />
                </div>
                <span style={styles.fieldHint}>
                  {isValidProfessor
                    ? 'Your professor ID as registered in the system'
                    : '8-digit student ID number (e.g. 20210001)'}
                </span>
              </div>

              {/* Birthdate */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Birthdate (ddmmyy)</label>
                <div style={styles.inputWrapper}>
                  <Calendar size={16} style={styles.inputIcon} />
                  <input
                    type="text" required
                    maxLength={6}
                    placeholder="140802"
                    value={birthdate} onChange={(e) => setBirthdate(e.target.value)}
                    style={{ ...styles.inputField, fontFamily: 'var(--mono)' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Password — always shown */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                type="password" required
                placeholder="••••••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={styles.inputField}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              backgroundColor: loading ? 'var(--code-bg)' : 'var(--accent)',
              color:  loading ? 'var(--text)' : '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>{authMode === 'signup' ? 'Create Account' : 'Verify Credentials'}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}

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
  fieldHint: {
    fontSize: '11px',
    color: 'var(--text)',
    opacity: 0.55,
    paddingLeft: '2px',
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
