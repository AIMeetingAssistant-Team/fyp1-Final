import { useContext, useState, useEffect, useMemo } from "react";
import { apiRequest } from "../../utils/api";
import { AuthContext } from "../../context/AuthContext";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

export default function ProfileInfo({ myProfile, setMyProfile }) {
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    phone: "",
    organization: "",
    jobTitle: "",
    department: "",
    timezone: "UTC",
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const { updateUserProfile } = useContext(AuthContext);

  // Get all IANA timezones
  const getAllTimezones = () => {
    try {
      // Comprehensive list of IANA timezones
      const timezones = Intl.supportedValuesOf('timeZone');

      // Sort timezones by their UTC offset
      const sortedTimezones = timezones.sort((a, b) => {
        try {
          const now = new Date();
          const offsetA = new Date(now.toLocaleString('en-US', { timeZone: a })).getTime() - now.getTime();
          const offsetB = new Date(now.toLocaleString('en-US', { timeZone: b })).getTime() - now.getTime();
          return offsetA - offsetB;
        } catch {
          return 0;
        }
      });

      return sortedTimezones;
    } catch (error) {
      console.error("Error getting timezones:", error);
      // Return a comprehensive fallback list
      return generateComprehensiveTimezones();
    }
  };

  // Generate comprehensive timezone list as fallback
  const generateComprehensiveTimezones = () => {
    const regions = {
      "Africa": [
        "Abidjan", "Accra", "Addis_Ababa", "Algiers", "Asmara", "Bamako", "Bangui", "Banjul",
        "Bissau", "Blantyre", "Brazzaville", "Bujumbura", "Cairo", "Casablanca", "Ceuta",
        "Conakry", "Dakar", "Dar_es_Salaam", "Djibouti", "Douala", "El_Aaiun", "Freetown",
        "Gaborone", "Harare", "Johannesburg", "Juba", "Kampala", "Khartoum", "Kigali",
        "Kinshasa", "Lagos", "Libreville", "Lome", "Luanda", "Lubumbashi", "Lusaka",
        "Malabo", "Maputo", "Maseru", "Mbabane", "Mogadishu", "Monrovia", "Nairobi",
        "Ndjamena", "Niamey", "Nouakchott", "Ouagadougou", "Porto-Novo", "Sao_Tome",
        "Tripoli", "Tunis", "Windhoek"
      ],
      "America": [
        "Adak", "Anchorage", "Anguilla", "Antigua", "Araguaina", "Argentina/Buenos_Aires",
        "Argentina/Catamarca", "Argentina/Cordoba", "Argentina/Jujuy", "Argentina/La_Rioja",
        "Argentina/Mendoza", "Argentina/Rio_Gallegos", "Argentina/Salta", "Argentina/San_Juan",
        "Argentina/San_Luis", "Argentina/Tucuman", "Argentina/Ushuaia", "Aruba", "Asuncion",
        "Atikokan", "Bahia", "Bahia_Banderas", "Barbados", "Belem", "Belize", "Blanc-Sablon",
        "Boa_Vista", "Bogota", "Boise", "Cambridge_Bay", "Campo_Grande", "Cancun", "Caracas",
        "Cayenne", "Cayman", "Chicago", "Chihuahua", "Costa_Rica", "Creston", "Cuiaba",
        "Curacao", "Danmarkshavn", "Dawson", "Dawson_Creek", "Denver", "Detroit", "Dominica",
        "Edmonton", "Eirunepe", "El_Salvador", "Fort_Nelson", "Fortaleza", "Glace_Bay",
        "Godthab", "Goose_Bay", "Grand_Turk", "Grenada", "Guadeloupe", "Guatemala",
        "Guayaquil", "Guyana", "Halifax", "Havana", "Hermosillo", "Indiana/Indianapolis",
        "Indiana/Knox", "Indiana/Marengo", "Indiana/Petersburg", "Indiana/Tell_City",
        "Indiana/Vevay", "Indiana/Vincennes", "Indiana/Winamac", "Inuvik", "Iqaluit",
        "Jamaica", "Juneau", "Kentucky/Louisville", "Kentucky/Monticello", "Kralendijk",
        "La_Paz", "Lima", "Los_Angeles", "Lower_Princes", "Maceio", "Managua", "Manaus",
        "Marigot", "Martinique", "Matamoros", "Mazatlan", "Menominee", "Merida", "Metlakatla",
        "Mexico_City", "Miquelon", "Moncton", "Monterrey", "Montevideo", "Montreal",
        "Montserrat", "Nassau", "New_York", "Nipigon", "Nome", "Noronha", "North_Dakota/Beulah",
        "North_Dakota/Center", "North_Dakota/New_Salem", "Nuuk", "Ojinaga", "Panama",
        "Paramaribo", "Phoenix", "Port-au-Prince", "Port_of_Spain", "Porto_Velho",
        "Puerto_Rico", "Punta_Arenas", "Rainy_River", "Rankin_Inlet", "Recife", "Regina",
        "Resolute", "Rio_Branco", "Santarem", "Santiago", "Santo_Domingo", "Sao_Paulo",
        "Scoresbysund", "Sitka", "St_Barthelemy", "St_Johns", "St_Kitts", "St_Lucia",
        "St_Thomas", "St_Vincent", "Swift_Current", "Tegucigalpa", "Thule", "Thunder_Bay",
        "Tijuana", "Toronto", "Tortola", "Vancouver", "Whitehorse", "Winnipeg", "Yakutat",
        "Yellowknife"
      ],
      "Antarctica": [
        "Casey", "Davis", "DumontDUrville", "Macquarie", "Mawson", "McMurdo", "Palmer",
        "Rothera", "Syowa", "Troll", "Vostok"
      ],
      "Asia": [
        "Aden", "Almaty", "Amman", "Anadyr", "Aqtau", "Aqtobe", "Ashgabat", "Atyrau",
        "Baghdad", "Bahrain", "Baku", "Bangkok", "Barnaul", "Beirut", "Bishkek",
        "Brunei", "Chita", "Choibalsan", "Colombo", "Damascus", "Dhaka", "Dili",
        "Dubai", "Dushanbe", "Famagusta", "Gaza", "Hanoi", "Harare", "Hebron",
        "Ho_Chi_Minh", "Hong_Kong", "Hovd", "Irkutsk", "Jakarta", "Jayapura",
        "Jerusalem", "Kabul", "Kamchatka", "Karachi", "Kashgar", "Kathmandu",
        "Khandyga", "Kolkata", "Krasnoyarsk", "Kuala_Lumpur", "Kuching", "Kuwait",
        "Macau", "Magadan", "Makassar", "Manila", "Muscat", "Nicosia", "Novokuznetsk",
        "Novosibirsk", "Omsk", "Oral", "Phnom_Penh", "Pontianak", "Pyongyang",
        "Qatar", "Qostanay", "Qyzylorda", "Riyadh", "Sakhalin", "Samarkand",
        "Seoul", "Shanghai", "Singapore", "Srednekolymsk", "Taipei", "Tashkent",
        "Tbilisi", "Tehran", "Thimphu", "Tokyo", "Tomsk", "Ulaanbaatar", "Urumqi",
        "Ust-Nera", "Vientiane", "Vladivostok", "Yakutsk", "Yangon", "Yekaterinburg",
        "Yerevan"
      ],
      "Atlantic": [
        "Azores", "Bermuda", "Canary", "Cape_Verde", "Faroe", "Madeira", "Reykjavik",
        "South_Georgia", "St_Helena", "Stanley"
      ],
      "Australia": [
        "Adelaide", "Brisbane", "Broken_Hill", "Currie", "Darwin", "Eucla", "Hobart",
        "Lindeman", "Lord_Howe", "Melbourne", "Perth", "Sydney"
      ],
      "Europe": [
        "Amsterdam", "Andorra", "Astrakhan", "Athens", "Belgrade", "Berlin", "Brussels",
        "Bucharest", "Budapest", "Chisinau", "Copenhagen", "Dublin", "Gibraltar",
        "Helsinki", "Istanbul", "Kaliningrad", "Kiev", "Kirov", "Lisbon", "London",
        "Luxembourg", "Madrid", "Malta", "Minsk", "Monaco", "Moscow", "Oslo", "Paris",
        "Prague", "Riga", "Rome", "Samara", "Saratov", "Simferopol", "Sofia", "Stockholm",
        "Tallinn", "Tirane", "Ulyanovsk", "Uzhgorod", "Vienna", "Vilnius", "Volgograd",
        "Warsaw", "Zagreb", "Zaporozhye", "Zurich"
      ],
      "Indian": [
        "Antananarivo", "Chagos", "Christmas", "Cocos", "Comoro", "Kerguelen", "Mahe",
        "Maldives", "Mauritius", "Mayotte", "Reunion"
      ],
      "Pacific": [
        "Apia", "Auckland", "Bougainville", "Chatham", "Chuuk", "Easter", "Efate",
        "Enderbury", "Fakaofo", "Fiji", "Funafuti", "Galapagos", "Gambier", "Guadalcanal",
        "Guam", "Honolulu", "Kiritimati", "Kosrae", "Kwajalein", "Majuro", "Marquesas",
        "Midway", "Nauru", "Niue", "Norfolk", "Noumea", "Pago_Pago", "Palau",
        "Pitcairn", "Pohnpei", "Port_Moresby", "Rarotonga", "Saipan", "Tahiti",
        "Tarawa", "Tongatapu", "Wake", "Wallis"
      ]
    };

    const timezones = ["UTC"];

    // Add all timezones from all regions
    Object.entries(regions).forEach(([region, cities]) => {
      cities.forEach(city => {
        timezones.push(`${region}/${city}`);
      });
    });

    return timezones;
  };

  // Get formatted timezone options
  const timezoneOptions = useMemo(() => {
    const allTimezones = getAllTimezones();

    return allTimezones.map(tz => {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          timeZoneName: 'longOffset'
        });

        const parts = formatter.formatToParts(now);
        const offset = parts.find(part => part.type === 'timeZoneName')?.value || '';

        // Format the label nicely
        let label = tz;
        if (tz.includes('/')) {
          const parts = tz.split('/');
          const region = parts[0];
          const city = parts[1].replace(/_/g, ' ');
          label = `${region}/${city} (${offset})`;
        } else {
          label = `${tz} (${offset})`;
        }

        return { value: tz, label, offset };
      } catch {
        return { value: tz, label: tz, offset: '' };
      }
    });
  }, []);

  // Initialize form data
  useEffect(() => {
    if (myProfile) {
      const initialData = {
        name: myProfile.name || "",
        bio: myProfile.bio || "",
        phone: myProfile.phone || "",
        organization: myProfile.organization || "",
        jobTitle: myProfile.jobTitle || "",
        department: myProfile.department || "",
        timezone: myProfile.timezone || getDefaultTimezone(),
      };
      setFormData(initialData);
    }
  }, [myProfile]);

  // Get default timezone (user's local timezone)
  const getDefaultTimezone = () => {
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Check if it exists in our list
      const exists = timezoneOptions.find(tz => tz.value === userTimezone);
      return exists ? userTimezone : "UTC";
    } catch {
      return "UTC";
    }
  };

  // Format timezone for display
  const formatTimezone = (timezone) => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset'
      });
      const parts = formatter.formatToParts(now);
      const offset = parts.find(part => part.type === 'timeZoneName')?.value || '';

      if (timezone.includes('/')) {
        const [, city] = timezone.split('/');
        return `${city.replace(/_/g, ' ')} (${offset})`;
      }
      return `${timezone} (${offset})`;
    } catch {
      return timezone;
    }
  };

  // Handle form changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Handle phone number change
  const handlePhoneChange = (phone) => {
    setFormData(prev => ({ ...prev, phone: phone || "" }));
    setIsDirty(true);
    if (fieldErrors.phone) {
      setFieldErrors(prev => ({ ...prev, phone: "" }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Validate name
    if (!formData.name.trim()) {
      errors.name = "Full name is required";
      isValid = false;
    } else if (formData.name.length < 2) {
      errors.name = "Name must be at least 2 characters";
      isValid = false;
    } else if (formData.name.length > 50) {
      errors.name = "Name must be less than 50 characters";
      isValid = false;
    }

    // Validate phone (optional but if provided, must be valid)
    if (formData.phone && !isValidPhoneNumber(formData.phone)) {
      errors.phone = "Please enter a valid international phone number";
      isValid = false;
    }

    // Validate bio length
    if (formData.bio && formData.bio.length > 500) {
      errors.bio = "Bio must be less than 500 characters";
      isValid = false;
    }

    // Validate organization
    if (formData.organization && formData.organization.length > 100) {
      errors.organization = "Organization name must be less than 100 characters";
      isValid = false;
    }

    // Validate job title
    if (formData.jobTitle && formData.jobTitle.length > 50) {
      errors.jobTitle = "Job title must be less than 50 characters";
      isValid = false;
    }

    // Validate department
    if (formData.department && formData.department.length > 50) {
      errors.department = "Department must be less than 50 characters";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  // Handle form submission
  const handleSave = async () => {
    setMessage({ type: "", text: "" });

    if (!validateForm()) {
      setMessage({
        type: "error",
        text: "Please fix the errors in the form before saving."
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        phone: formData.phone,
        organization: formData.organization.trim(),
        jobTitle: formData.jobTitle.trim(),
        department: formData.department.trim(),
        timezone: formData.timezone,
      };

      const res = await apiRequest(
        "/auth/profile/enhanced",
        "PUT",
        payload,
        localStorage.getItem("token")
      );

      if (res.success) {
        setMyProfile(res.user);
        updateUserProfile({ name: res.user.name });
        setMessage({
          type: "success",
          text: "Profile updated successfully!",
        });
        setIsDirty(false);
      } else {
        setMessage({
          type: "error",
          text: res.message || "Failed to update profile. Please try again.",
        });
      }
    } catch (error) {
      console.error("Update error:", error);
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form to original values
  const resetForm = () => {
    if (myProfile) {
      setFormData({
        name: myProfile.name || "",
        bio: myProfile.bio || "",
        phone: myProfile.phone || "",
        organization: myProfile.organization || "",
        jobTitle: myProfile.jobTitle || "",
        department: myProfile.department || "",
        timezone: myProfile.timezone || getDefaultTimezone(),
      });
    }
    setFieldErrors({});
    setMessage({ type: "", text: "" });
    setIsDirty(false);
  };

  // Filter timezones based on search
  const [timezoneSearch, setTimezoneSearch] = useState("");

  const filteredTimezones = useMemo(() => {
    if (!timezoneSearch) return timezoneOptions;

    const searchLower = timezoneSearch.toLowerCase();
    return timezoneOptions.filter(tz =>
      tz.label.toLowerCase().includes(searchLower) ||
      tz.value.toLowerCase().includes(searchLower)
    );
  }, [timezoneOptions, timezoneSearch]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-7">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F1E36] mb-2">
            Profile Information
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Update your personal and professional details. All changes are saved securely.
          </p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg border ${message.type === "success"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
            }`}>
            <div className="flex items-start">
              <div className={`flex-shrink-0 mt-0.5 ${message.type === "success" ? "text-green-500" : "text-red-500"
                }`}>
                {message.type === "success" ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{message.text}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

              {/* Personal Information Column */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F1E36] mb-6 pb-3 border-b border-gray-200">
                    Personal Information
                  </h3>

                  {/* Full Name */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border ${fieldErrors.name
                        ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-cyan-500 focus:border-cyan-500"
                        } focus:ring-2 focus:ring-opacity-50 transition-colors`}
                      placeholder="John Doe"
                    />
                    <div className="mt-1 flex justify-between">
                      {fieldErrors.name ? (
                        <span className="text-red-600 text-sm">{fieldErrors.name}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          Required field
                        </span>
                      )}
                      <span className={`text-xs ${formData.name.length > 50 ? 'text-red-500' : 'text-gray-400'}`}>
                        {formData.name.length}/50
                      </span>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>

                    {/* Wrapper for single border */}
                    <div className={`flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500 ${fieldErrors.phone ? 'border-red-500' : 'border-gray-300'}`}>
                      <PhoneInput
                        international
                        defaultCountry="PK"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        className="w-full px-4 py-3 text-gray-900 placeholder-gray-400 outline-none border-none"
                        placeholder="+92 123 4567890"
                      />
                    </div>

                    {fieldErrors.phone && (
                      <span className="text-red-600 text-sm mt-1 block">{fieldErrors.phone}</span>
                    )}
                    <p className="text-gray-400 text-xs mt-1">
                      Include country code. Leave empty if not applicable.
                    </p>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    <textarea
                      rows={4}
                      value={formData.bio}
                      onChange={(e) => handleChange("bio", e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border ${fieldErrors.bio
                        ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-cyan-500 focus:border-cyan-500"
                        } focus:ring-2 focus:ring-opacity-50 resize-none transition-colors`}
                      placeholder="Tell us about yourself, your interests, or anything you'd like to share..."
                    />
                    <div className="mt-1 flex justify-between">
                      {fieldErrors.bio ? (
                        <span className="text-red-600 text-sm">{fieldErrors.bio}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          Brief introduction about yourself
                        </span>
                      )}
                      <span className={`text-xs ${formData.bio.length > 500 ? 'text-red-500' : 'text-gray-400'}`}>
                        {formData.bio.length}/500
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information Column */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F1E36] mb-6 pb-3 border-b border-gray-200">
                    Professional Information
                  </h3>

                  {/* Organization */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization
                    </label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={(e) => handleChange("organization", e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border ${fieldErrors.organization
                        ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-cyan-500 focus:border-cyan-500"
                        } focus:ring-2 focus:ring-opacity-50 transition-colors`}
                      placeholder="Your company or organization"
                    />
                    <div className="mt-1 flex justify-between">
                      {fieldErrors.organization && (
                        <span className="text-red-600 text-sm">{fieldErrors.organization}</span>
                      )}
                      <span className={`text-xs ${formData.organization.length > 100 ? 'text-red-500' : 'text-gray-400'}`}>
                        {formData.organization.length}/100
                      </span>
                    </div>
                  </div>

                  {/* Job Title and Department */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={formData.jobTitle}
                        onChange={(e) => handleChange("jobTitle", e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border ${fieldErrors.jobTitle
                          ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-cyan-500 focus:border-cyan-500"
                          } focus:ring-2 focus:ring-opacity-50 transition-colors`}
                        placeholder="e.g., Senior Developer"
                      />
                      {fieldErrors.jobTitle && (
                        <span className="text-red-600 text-sm mt-1 block">{fieldErrors.jobTitle}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department
                      </label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => handleChange("department", e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border ${fieldErrors.department
                          ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                          : "border-gray-300 focus:ring-cyan-500 focus:border-cyan-500"
                          } focus:ring-2 focus:ring-opacity-50 transition-colors`}
                        placeholder="e.g., Engineering"
                      />
                      {fieldErrors.department && (
                        <span className="text-red-600 text-sm mt-1 block">{fieldErrors.department}</span>
                      )}
                    </div>
                  </div>

                  {/* Timezone - Enhanced with Search */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>

                    {/* Timezone Search */}
                    <div className="mb-3">
                      <input
                        type="text"
                        value={timezoneSearch}
                        onChange={(e) => setTimezoneSearch(e.target.value)}
                        placeholder="Search timezones..."
                        className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      />
                      {timezoneSearch && (
                        <p className="text-xs text-gray-500 mt-1">
                          Found {filteredTimezones.length} timezone{filteredTimezones.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    {/* Timezone Select */}
                    <div className="relative">
                      <select
                        value={formData.timezone}
                        onChange={(e) => handleChange("timezone", e.target.value)}
                        className="w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors bg-white appearance-none"
                        style={{ height: '3rem' }}
                      >
                        <option value="">Select a timezone...</option>
                        {filteredTimezones.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>

                      {/* Custom Chevron */}
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-gray-400 text-xs">
                        Used for scheduling and notifications
                      </p>
                      <p className="text-cyan-600 text-xs font-medium">
                        Current: {formatTimezone(formData.timezone)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-10 pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-end gap-4">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={!isDirty || loading}
                  className={`px-5 py-3 text-sm font-medium rounded-lg transition-colors ${!isDirty || loading
                    ? "text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed"
                    : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  Reset Changes
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading || !isDirty}
                  className={`px-6 py-3 text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${loading || !isDirty
                    ? "bg-cyan-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-sm"
                    }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Timezone Information */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Timezone data includes all IANA timezones from around the world
          </p>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        .phone-input-container .PhoneInput {
          display: flex;
          align-items: center;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          overflow: hidden;
          background: white;
          transition: all 0.2s;
        }
        
        .phone-input-container .PhoneInput:hover {
          border-color: #9ca3af;
        }
        
        .phone-input-container .PhoneInput:focus-within {
          border-color: #06b6d4;
          box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.1);
        }
        
        .phone-input-container .PhoneInputCountry {
          padding: 0 0.75rem;
          border-right: 1px solid #e5e7eb;
          height: 100%;
        }
        
        .phone-input-container .PhoneInputCountrySelect {
          margin-left: 0.5rem;
        }
        
        .phone-input-container .PhoneInputCountrySelectArrow {
          border-top-color: #6b7280;
        }
        
        .phone-input-container .PhoneInputInput {
          flex: 1;
          border: none;
          padding: 0.75rem;
          outline: none;
          font-size: 0.875rem;
          background: transparent;
        }
        
        .phone-input-container .PhoneInputInput::placeholder {
          color: #9ca3af;
        }
        
        .phone-input-container .PhoneInputInput:focus {
          box-shadow: none;
        }
        
        /* Error state */
        .phone-input-container.border-red-500 .PhoneInput {
          border-color: #ef4444;
        }
        
        .phone-input-container.border-red-500 .PhoneInput:focus-within {
          border-color: #ef4444;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
        }
        
        /* Timezone select styling */
        select {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
          padding-right: 2.5rem;
        }
      `}</style>
    </div>
  );
}