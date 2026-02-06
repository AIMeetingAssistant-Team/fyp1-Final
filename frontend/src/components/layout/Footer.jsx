import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Calendar, 
  FileText, 
  Users, 
  Shield, 
  Zap, 
  Mail, 
  Phone, 
  MapPin, 
  Twitter, 
  Linkedin, 
  Github,
  Globe,
  ChevronRight
} from "lucide-react";

export default function Footer() {
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();
  
  const footerLinks = [
    {
      title: "Product",
      links: [
        { label: "Features", path: "/features" },
        { label: "Pricing", path: "/pricing" },
        { label: "Use Cases", path: "/use-cases" },
        { label: "Integrations", path: "/integrations" },
        { label: "API", path: "/api" }
      ]
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", path: "/docs" },
        { label: "Help Center", path: "/help" },
        { label: "Blog", path: "/blog" },
        { label: "Tutorials", path: "/tutorials" },
        { label: "Community", path: "/community" }
      ]
    },
    {
      title: "Company",
      links: [
        { label: "About Us", path: "/about" },
        { label: "Careers", path: "/careers" },
        { label: "Contact", path: "/contact" },
        { label: "Privacy", path: "/privacy" },
        { label: "Terms", path: "/terms" }
      ]
    }
  ];

  const contactInfo = [
    { icon: <Mail className="w-4 h-4" />, text: "support@ai-mt-assistant.com" },
    { icon: <Phone className="w-4 h-4" />, text: "+1 (555) 123-4567" },
    { icon: <MapPin className="w-4 h-4" />, text: "San Francisco, CA" }
  ];

  const socialLinks = [
    { icon: <Twitter className="w-5 h-5" />, url: "https://twitter.com", label: "Twitter" },
    { icon: <Linkedin className="w-5 h-5" />, url: "https://linkedin.com", label: "LinkedIn" },
    { icon: <Github className="w-5 h-5" />, url: "https://github.com", label: "GitHub" }
  ];

  return (
    <footer className="relative bg-gray-900 text-white border-t border-gray-800">
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-cyan-600"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg blur opacity-20"></div>
                <div className="relative bg-gradient-to-r from-cyan-600 to-cyan-700 w-10 h-10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-500 bg-clip-text text-transparent">
                  M&T Assistant
                </h2>
                <p className="text-sm text-gray-400">Meeting & Task Management</p>
              </div>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed max-w-md">
              Transform your meetings with AI-powered transcription, instant summaries, 
              and actionable insights. Join thousands of teams who trust us.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 pt-4">
              {contactInfo.map((info, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="text-cyan-400">
                    {info.icon}
                  </div>
                  <span className="text-sm text-gray-300">{info.text}</span>
                </div>
              ))}
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4 pt-6">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -2 }}
                  className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-gray-700 transition-all duration-200"
                  aria-label={social.label}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {footerLinks.map((section, index) => (
            <div key={index} className="space-y-4">
              <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-cyan-500" />
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      to={link.path}
                      className="text-sm text-gray-400 hover:text-cyan-400 transition-colors duration-200 flex items-center gap-2 group"
                    >
                      <div className="w-1 h-1 rounded-full bg-gray-600 group-hover:bg-cyan-500 transition-colors"></div>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Features Highlight */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Shield className="w-5 h-5" />, text: "Enterprise Security" },
              { icon: <Zap className="w-5 h-5" />, text: "Real-time Processing" },
              { icon: <Globe className="w-5 h-5" />, text: "Global Support" },
              { icon: <Users className="w-5 h-5" />, text: "Team Collaboration" }
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                <div className="text-cyan-500">
                  {feature.icon}
                </div>
                <span className="text-sm text-gray-300">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <span className="text-sm text-gray-400">
                © {currentYear} M&T Assistant. All rights reserved.
              </span>
              <div className="hidden md:flex items-center gap-4">
                <Link to="/privacy" className="text-xs text-gray-400 hover:text-cyan-400 transition-colors">
                  Privacy Policy
                </Link>
                <span className="text-gray-600">•</span>
                <Link to="/terms" className="text-xs text-gray-400 hover:text-cyan-400 transition-colors">
                  Terms of Service
                </Link>
                <span className="text-gray-600">•</span>
                <Link to="/cookies" className="text-xs text-gray-400 hover:text-cyan-400 transition-colors">
                  Cookie Policy
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate("/signup")}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Get Started
              </button>
              <button 
                onClick={() => navigate("/demo")}
                className="px-4 py-2 border border-cyan-700 text-cyan-400 text-sm font-semibold rounded-lg hover:bg-cyan-900/20 transition-all duration-200"
              >
                Request Demo
              </button>
            </div>
          </div>

          {/* Mobile bottom links */}
          <div className="mt-4 md:hidden flex flex-wrap items-center justify-center gap-3">
            <Link to="/privacy" className="text-xs text-gray-400 hover:text-cyan-400 transition-colors">
              Privacy
            </Link>
            <span className="text-gray-600">•</span>
            <Link to="/terms" className="text-xs text-gray-400 hover:text-cyan-400 transition-colors">
              Terms
            </Link>
            <span className="text-gray-600">•</span>
            <Link to="/cookies" className="text-xs text-gray-400 hover:text-cyan-400 transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        <span className="text-xs text-gray-400">All systems operational</span>
      </div>
    </footer>
  );
}