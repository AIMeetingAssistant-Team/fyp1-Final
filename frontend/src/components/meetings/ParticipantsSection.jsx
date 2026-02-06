import { UserMinus, UserPlus } from "lucide-react";

export default function ParticipantsSection({
  selected,
  participantId,
  setParticipantId,
  addParticipant,
  removeParticipant,
  editMode,
  isValidEmail
}) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2">Participants</h3>

      <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-2">
        {selected.participants.map((p, index) => (
          <div
            key={`${p.user._id}-${p.role}-${index}`} // unique key
            className="flex justify-between items-center"
          >
            <span>
              {p.user.name} ({p.role})
            </span>

            {selected.canEdit && p.role !== "host" && (
              <button
                className="text-red-500 hover:text-red-700"
                onClick={() => removeParticipant(p.user._id)}
              >
                <UserMinus size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      {selected.canEdit && !editMode && (
        <div className="flex mt-2 gap-2">
          <input
            type="email"
            placeholder="Enter participant email"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            className="flex-1 border p-2 rounded"
          />
          <button
            onClick={addParticipant}
            disabled={!isValidEmail(participantId)}
            className={`flex items-center gap-1 px-4 rounded ${isValidEmail(participantId) ? "bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
          >
            <UserPlus size={18} /> Add
          </button>
        </div>
      )}
    </div>
  );
}
