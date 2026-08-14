import { useState } from "react";
import { db } from "../../firebase/config";
import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import ConfirmModal from "../ConfirmModal";
import toast from "react-hot-toast";

export default function CategoryManager({ cashbookId, categories, show, onClose }) {
  const [catInput, setCatInput] = useState("");
  const [editingCatId, setEditingCatId] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: "confirm", message: "", onConfirm: null });

  if (!show) return null;

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catInput.trim()) return;
    try {
      if (editingCatId) {
        await updateDoc(doc(db, "cashbooks", cashbookId, "categories", editingCatId), { name: catInput.trim() });
      } else {
        await addDoc(collection(db, "cashbooks", cashbookId, "categories"), { name: catInput.trim() });
      }
      setCatInput("");
      setEditingCatId(null);
      toast.success(editingCatId ? "Category updated!" : "Category added!");
    } catch (err) {
      console.error("Error saving category:", err);
      toast.error("Failed to save category.");
    }
  };

  const handleDeleteCategory = (catId) => {
    setModalConfig({
      isOpen: true,
      type: "confirm",
      message: "Are you sure you want to delete this category?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "cashbooks", cashbookId, "categories", catId));
          toast.success("Category deleted.");
        } catch (err) {
          console.error("Error deleting category:", err);
          toast.error("Failed to delete category.");
        }
      }
    });
  };

  return (
    <div className="px-4">
      <ConfirmModal 
        isOpen={modalConfig.isOpen} 
        type={modalConfig.type} 
        message={modalConfig.message} 
        onConfirm={modalConfig.onConfirm} 
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} 
      />
      <div className="card mt-4 border border-brandBlue">
        
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-h2 m-0 text-base">Manage Categories</h4>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-xl text-textMuted leading-none hover:text-white transition-colors">×</button>
        </div>
        
        <form onSubmit={handleSaveCategory} className="flex gap-2.5 mb-5">
          <input 
            type="text" 
            placeholder="e.g., Rent, Food, Salary" 
            value={catInput} 
            onChange={(e) => setCatInput(e.target.value)} 
            required 
            className="flex-1 px-3.5 py-2.5 rounded-lg border border-borderLight text-sm bg-white/5 text-textMain transition-all focus:outline-none focus:border-brandBlue focus:bg-white/10" 
          />
          <button type="submit" className="btn-primary w-auto px-5 py-2.5 text-sm">
            {editingCatId ? "Update" : "Add"}
          </button>
          
          {editingCatId && (
            <button 
              type="button" 
              onClick={() => {setEditingCatId(null); setCatInput("");}} 
              className="px-4 py-2.5 bg-white/10 text-white border-none rounded-lg cursor-pointer font-semibold text-sm transition-colors hover:bg-white/20"
            >
              Cancel
            </button>
          )}
        </form>

        <div className="flex flex-wrap gap-3">
          {categories.length === 0 && <span className="text-muted text-sm">No categories yet. Add one above.</span>}
          
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm font-medium text-white border border-white/5">
              <span>{cat.name}</span>
              
              <div className="flex gap-1 border-l border-white/20 pl-2 ml-1">
                <button 
                  onClick={() => {setEditingCatId(cat.id); setCatInput(cat.name);}} 
                  className="bg-transparent border-none text-brandBlue cursor-pointer p-0 text-xs hover:underline"
                >Edit</button>
                <button 
                  onClick={() => handleDeleteCategory(cat.id)} 
                  className="bg-transparent border-none text-cashOut cursor-pointer p-0 text-xs ml-1 hover:underline"
                >Del</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}