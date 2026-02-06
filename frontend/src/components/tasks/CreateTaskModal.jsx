import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, Mail, AlertCircle } from 'lucide-react';

const CreateTaskModal = ({ onClose, onSubmit, meetings, user }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        meetingId: '',
        emails: [],
        priority: 'medium',
        dueDate: '',
        estimatedHours: ''
    });
    const [emailInput, setEmailInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({}); // Changed to object for multiple errors
    const [touched, setTouched] = useState({}); // Track touched fields

    // Get participants for selected meeting
    const [meetingParticipants, setMeetingParticipants] = useState([]);

    useEffect(() => {
        if (formData.meetingId) {
            const selectedMeeting = meetings.find(m => m._id === formData.meetingId);
            if (selectedMeeting?.participants) {
                setMeetingParticipants(selectedMeeting.participants);
            }
        }
    }, [formData.meetingId, meetings]);

    // Validation function
    const validateField = (name, value) => {
        const newErrors = { ...errors };

        switch (name) {
            case 'title':
                if (!value.trim()) {
                    newErrors.title = 'Title is required';
                } else if (value.length > 200) {
                    newErrors.title = 'Title cannot exceed 200 characters';
                } else {
                    delete newErrors.title;
                }
                break;

            case 'description':
                if (value && value.length > 2000) {
                    newErrors.description = 'Description cannot exceed 2000 characters';
                } else {
                    delete newErrors.description;
                }
                break;

            case 'meetingId':
                if (!value) {
                    newErrors.meetingId = 'Please select a meeting';
                } else {
                    delete newErrors.meetingId;
                }
                break;

            case 'estimatedHours':
                if (value) {
                    const hours = parseFloat(value);
                    if (isNaN(hours) || hours < 0 || hours > 1000) {
                        newErrors.estimatedHours = 'Estimated hours must be between 0 and 1000';
                    } else {
                        delete newErrors.estimatedHours;
                    }
                } else {
                    delete newErrors.estimatedHours;
                }
                break;

            case 'dueDate':
                if (value) {
                    const selectedDate = new Date(value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (selectedDate < today) {
                        newErrors.dueDate = 'Due date cannot be in the past';
                    } else {
                        delete newErrors.dueDate;
                    }
                } else {
                    delete newErrors.dueDate;
                }
                break;

            case 'emails':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const invalidEmails = formData.emails.filter(email => !emailRegex.test(email));
                if (invalidEmails.length > 0) {
                    newErrors.emails = 'All email addresses must be valid';
                } else {
                    delete newErrors.emails;
                }
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle blur (when user leaves a field)
    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        validateField(name, formData[name]);
    };

    // Handle input changes with validation
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (touched[name]) {
            validateField(name, value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Enhanced validation
        const validationErrors = {};

        // Title validation
        if (!formData.title.trim()) {
            validationErrors.title = 'Title is required';
        } else if (formData.title.length > 200) {
            validationErrors.title = 'Title cannot exceed 200 characters';
        }

        // Meeting validation
        if (!formData.meetingId) {
            validationErrors.meeting = 'Please select a meeting';
        }

        // Email validation - MAKE REQUIRED
        if (formData.emails.length === 0) {
            validationErrors.emails = 'At least one email is required to assign the task';
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const invalidEmails = formData.emails.filter(email => !emailRegex.test(email));
            if (invalidEmails.length > 0) {
                validationErrors.emails = 'All email addresses must be valid';
            }
        }

        // Due Date validation - MAKE REQUIRED
        if (!formData.dueDate) {
            validationErrors.dueDate = 'Due date is required';
        } else {
            const selectedDate = new Date(formData.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                validationErrors.dueDate = 'Due date cannot be in the past';
            }
        }

        // Description validation
        if (formData.description && formData.description.length > 2000) {
            validationErrors.description = 'Description cannot exceed 2000 characters';
        }

        // Estimated hours validation
        if (formData.estimatedHours) {
            const hours = parseFloat(formData.estimatedHours);
            if (isNaN(hours) || hours < 0 || hours > 1000) {
                validationErrors.estimatedHours = 'Estimated hours must be between 0 and 1000';
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);

        // Prepare data for API
        const taskData = {
            title: formData.title.trim(),
            description: formData.description ? formData.description.trim() : '',
            meetingId: formData.meetingId,
            emails: formData.emails,
            priority: formData.priority,
            dueDate: formData.dueDate, // Required now
            estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined
        };

        const result = await onSubmit(taskData);

        if (result.success) {
            onClose();
        } else {
            setErrors({ form: result.message });
        }

        setLoading(false);
    };

    const handleEmailAdd = () => {
        const email = emailInput.trim();
        if (email) {
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setErrors(prev => ({ ...prev, emailInput: 'Please enter a valid email address' }));
                return;
            }

            if (!formData.emails.includes(email)) {
                setFormData(prev => ({
                    ...prev,
                    emails: [...prev.emails, email]
                }));
                setEmailInput('');
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.emailInput;
                    return newErrors;
                });

                // Validate emails array
                validateField('emails', [...formData.emails, email]);
            }
        }
    };

    const handleEmailRemove = (emailToRemove) => {
        setFormData(prev => ({
            ...prev,
            emails: prev.emails.filter(email => email !== emailToRemove)
        }));

        // Revalidate emails
        validateField('emails', formData.emails.filter(email => email !== emailToRemove));
    };

    const handleEmailKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleEmailAdd();
        }
    };

    // Check if form is valid
    const isFormValid = () => {
        return formData.title.trim() &&
            formData.meetingId &&
            Object.keys(errors).length === 0;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">Create New Task</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    {errors.form && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start">
                            <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            {errors.form}
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Task Title *
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                className={`w-full px-4 py-2.5 border ${errors.title ? 'border-red-300' : 'border-gray-300'
                                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                placeholder="Enter task title"
                            />
                            {errors.title && (
                                <p className="text-red-500 text-xs mt-1 flex items-center">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    {errors.title}
                                </p>
                            )}
                            {formData.title.length > 0 && !errors.title && (
                                <p className="text-gray-500 text-xs mt-1">
                                    {200 - formData.title.length} characters remaining
                                </p>
                            )}
                        </div>

                        {/* Meeting Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Meeting *
                            </label>
                            <select
                                name="meetingId"
                                value={formData.meetingId}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                className={`w-full px-4 py-2.5 border ${errors.meetingId ? 'border-red-300' : 'border-gray-300'
                                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            >
                                <option value="">Select a meeting</option>
                                {meetings.map(meeting => (
                                    <option key={meeting._id} value={meeting._id}>
                                        {meeting.title} - {new Date(meeting.startTime).toLocaleDateString()}
                                    </option>
                                ))}
                            </select>
                            {errors.meetingId && (
                                <p className="text-red-500 text-xs mt-1 flex items-center">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    {errors.meetingId}
                                </p>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                rows="3"
                                className={`w-full px-4 py-2.5 border ${errors.description ? 'border-red-300' : 'border-gray-300'
                                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                placeholder="Describe the task..."
                            />
                            {errors.description && (
                                <p className="text-red-500 text-xs mt-1 flex items-center">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    {errors.description}
                                </p>
                            )}
                            {formData.description.length > 0 && !errors.description && (
                                <p className="text-gray-500 text-xs mt-1">
                                    {2000 - formData.description.length} characters remaining
                                </p>
                            )}
                        </div>

                        {/* Email Assignment */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Assign To (Email Addresses) *
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <input
                                        type="email"
                                        value={emailInput}
                                        onChange={(e) => {
                                            setEmailInput(e.target.value);
                                            if (errors.emailInput) {
                                                setErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors.emailInput;
                                                    return newErrors;
                                                });
                                            }
                                        }}
                                        onKeyDown={handleEmailKeyDown}
                                        className={`w-full px-4 py-2.5 border ${errors.emailInput ? 'border-red-300' : 'border-gray-300'
                                            } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                        placeholder="Enter email and press Enter or comma"
                                    />
                                    {errors.emailInput && (
                                        <p className="text-red-500 text-xs mt-1 flex items-center">
                                            <AlertCircle className="w-3 h-3 mr-1" />
                                            {errors.emailInput}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleEmailAdd}
                                    className="px-4 py-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center"
                                >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Add
                                </button>
                            </div>

                            {/* Show selected emails */}
                            {formData.emails.length > 0 && (
                                <div className="mt-3">
                                    <div className="flex flex-wrap gap-2">
                                        {formData.emails.map((email, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-800"
                                            >
                                                {email}
                                                <button
                                                    type="button"
                                                    onClick={() => handleEmailRemove(email)}
                                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                                >
                                                    &times;
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    {errors.emails && (
                                        <p className="text-red-500 text-xs mt-2 flex items-center">
                                            <AlertCircle className="w-3 h-3 mr-1" />
                                            {errors.emails}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Show meeting participants for reference */}
                            {meetingParticipants.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-xs text-gray-500 mb-1">Meeting Participants (for reference):</p>
                                    <div className="flex flex-wrap gap-1">
                                        {meetingParticipants.map((participant, index) => {
                                            const email = participant.user?.email || participant.email;
                                            const name = participant.user?.name || participant.name;
                                            if (!email) return null;

                                            return (
                                                <span
                                                    key={index}
                                                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                                                    title={name ? `${name} (${email})` : email}
                                                >
                                                    {email}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Priority & Due Date & Estimated Hours */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Priority
                                </label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Due Date *
                                </label>
                                <input
                                    type="date"
                                    name="dueDate"
                                    value={formData.dueDate}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={`w-full px-4 py-2.5 border ${errors.dueDate ? 'border-red-300' : 'border-gray-300'
                                        } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                />
                                {errors.dueDate && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        {errors.dueDate}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Estimated Hours (Optional)
                                </label>
                                <input
                                    type="number"
                                    name="estimatedHours"
                                    value={formData.estimatedHours}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    min="0"
                                    max="1000"
                                    step="0.5"
                                    className={`w-full px-4 py-2.5 border ${errors.estimatedHours ? 'border-red-300' : 'border-gray-300'
                                        } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    placeholder="e.g., 2.5"
                                />
                                {errors.estimatedHours && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        {errors.estimatedHours}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !isFormValid()}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating...' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;