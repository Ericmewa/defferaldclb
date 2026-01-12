import mongoose from 'mongoose';

const userLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g. "CREATE_USER", "TOGGLE_ACTIVE", "CHANGE_ROLE"
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetEmail: String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByEmail: String,
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model('UserLog', userLogSchema);
