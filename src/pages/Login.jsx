import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login, signup, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address to reset your password.");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await resetPassword(email);
      setMessage("Password reset email sent! Check your inbox.");
    } catch (err) {
      console.error(err);
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center min-h-screen p-5">
      {/* App Branding Header */}
      <div className="text-center mb-8">
        <h1 className="text-brandBlue text-4xl font-extrabold tracking-tight mb-2">
          CashBook
        </h1>
        <p className="text-muted">Manage your ledgers effortlessly</p>
      </div>

      {/* Login/Signup Card */}
      <div className="card">
        <h2 className="text-h2 text-center mb-6">
          {isLogin ? "Welcome Back" : "Create an Account"}
        </h2>
        
        {error && (
          <div className="bg-red-500/15 text-red-300 p-3 mb-5 rounded-lg text-sm border border-red-500/30">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-emerald-500/15 text-emerald-300 p-3 mb-5 rounded-lg text-sm border border-emerald-500/30">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col">
          <input 
            type="email" 
            className="w-full p-4 rounded-lg border border-borderLight text-base mb-4 transition-all duration-300 bg-white/5 text-textMain focus:border-brandBlue focus:outline-none focus:bg-white/10 focus:shadow-[0_0_10px_rgba(99,102,241,0.3)]"
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            className="w-full p-4 rounded-lg border border-borderLight text-base mb-4 transition-all duration-300 bg-white/5 text-textMain focus:border-brandBlue focus:outline-none focus:bg-white/10 focus:shadow-[0_0_10px_rgba(99,102,241,0.3)]"
            placeholder="Password (min 6 characters)" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
          />
          <button 
            type="submit" 
            className="btn-primary mt-2"
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Please wait..." : (isLogin ? "Log In" : "Sign Up")}
          </button>
        </form>

        {isLogin && (
          <div className="text-right mt-2">
            <button 
              type="button"
              onClick={handleResetPassword}
              className="text-textMuted bg-transparent border-none font-medium text-xs cursor-pointer px-1 hover:underline hover:text-brandBlue"
            >
              Forgot Password?
            </button>
          </div>
        )}

        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-borderLight"></div>
          <span className="px-3 text-textMuted text-sm font-medium">OR</span>
          <div className="flex-1 h-px bg-borderLight"></div>
        </div>

        <button 
          type="button" 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full p-3 bg-white/10 text-white border border-white/20 rounded-lg text-base font-semibold flex justify-center items-center gap-3 transition-all duration-300 shadow-sm hover:bg-white/20"
          style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '20px' }} />
          Continue with Google
        </button>

        <div className="mt-6 text-center border-t border-borderLight pt-4">
          <span className="text-muted text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setError(""); // Clear errors when switching modes
              setMessage("");
            }}
            className="text-brandBlue bg-transparent border-none font-semibold text-sm cursor-pointer px-1 hover:underline"
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </div>
      </div>
      
    </div>
  );
}