import { useEffect, useRef, useState } from 'react';
import { useMediaDeviceSelect } from '@livekit/components-react';
import { ChevronDown } from 'lucide-react';

export default function MediaDevicePicker({ kind, label = 'Device' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({
    kind,
    requestPermissions: true,
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const activeLabel = devices.find((d) => d.deviceId === activeDeviceId)?.label || `Default ${label}`;

  return (
    <div className="vm-device-picker" ref={rootRef}>
      <button
        type="button"
        className={`vm-tool-more ${open ? 'is-open' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label={`Select ${label.toLowerCase()}`}
        title={activeLabel}
      >
        <ChevronDown size={14} strokeWidth={2} />
      </button>

      {open && (
        <div className="vm-device-dropdown" role="listbox" aria-label={`${label} devices`}>
          <p className="vm-device-dropdown-title">{label}</p>
          {devices.length === 0 ? (
            <p className="vm-device-dropdown-empty">No devices found</p>
          ) : (
            devices.map((device) => (
              <button
                key={device.deviceId}
                type="button"
                role="option"
                aria-selected={device.deviceId === activeDeviceId}
                className={device.deviceId === activeDeviceId ? 'is-active' : ''}
                onClick={() => {
                  setActiveMediaDevice(device.deviceId);
                  setOpen(false);
                }}
              >
                {device.label || `${label} ${device.deviceId.slice(0, 8)}`}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
