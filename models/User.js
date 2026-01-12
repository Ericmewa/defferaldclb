import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "rm", "approver", "cocreator", "cochecker", "customer"],
      default: "admin",
    },
    position: { type: String }, // e.g. 'Head of Business Segment', 'Director of Business Unit'
    active: { type: Boolean, default: true },
    customerNumber: String,
    customerId: { type: String, unique: true, sparse: true },
    customerNumber: String,

    // ⭐ Added RM ID field
    rmId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

// password hashing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
 
  console.log("Entered password:", enteredPassword);
  
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
