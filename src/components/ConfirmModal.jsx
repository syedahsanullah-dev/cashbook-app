export default function ConfirmModal({ isOpen, type = "confirm", message, onConfirm, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-5">
      
      <div className="card w-full max-w-[400px] animate-[slideUp_0.2s_ease-out] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]">
        
        <h3 className={`text-h1 mt-0 mb-3 text-[20px] ${type === "alert" ? "text-cashOut" : "text-textMain"}`}>
          {type === "alert" ? "Notice" : "Confirm Action"}
        </h3>
        
        <p className="text-muted leading-relaxed text-[15px] mb-6">
          {message}
        </p>
        
        <div className="flex justify-end gap-3">
          {type === "confirm" && (
            <button 
              onClick={onClose} 
              className="py-2.5 px-5 rounded-lg border border-borderLight bg-white/5 text-textMain cursor-pointer font-semibold text-sm transition-colors duration-200 hover:bg-white/10"
            >
              Cancel
            </button>
          )}
          
          <button 
            onClick={() => { if (onConfirm) onConfirm(); onClose(); }} 
            className={`btn-primary w-auto py-2.5 px-6 text-sm ${type === "alert" ? "!bg-brandBlue" : "!bg-cashOut"} !bg-none`}
          >
            {type === "alert" ? "OK" : "Yes, Proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}