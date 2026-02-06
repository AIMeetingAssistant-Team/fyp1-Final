import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Mic,
  FileText,
  CheckSquare,
  PlayCircle,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  UserPlus,
  Video
} from "lucide-react";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const fadeInUp = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const scaleIn = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

function FeatureCard({ title, desc, icon, delay }) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{
        y: -8,
        transition: { duration: 0.2 }
      }}
      className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl border border-gray-100 transition-all duration-300 w-full sm:max-w-sm"
    >
      <div className="flex flex-col items-start space-y-4">
        <motion.div
          className="p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-white border border-cyan-100"
          whileHover={{ rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="text-cyan-600">
            {icon}
          </div>
        </motion.div>
        <div className="space-y-3">
          <h3 className="font-bold text-gray-900 text-xl">{title}</h3>
          <p className="text-gray-600 leading-relaxed">{desc}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const steps = [
    "Sign up or log in to your AI M&T Assistant account",
    "Create or schedule your meeting and invite participants",
    "Live transcription & insights during the meeting",
    "Receive summarized minutes and task list instantly"
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-b from-white to-gray-50"
    >
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-6 md:py-6">
        <motion.div
          variants={containerVariants}
          className="flex flex-col lg:flex-row items-center justify-between gap-12"
        >
          <motion.div variants={itemVariants} className="lg:w-1/2 space-y-8">
            <div className="space-y-4">
              <motion.div
                variants={scaleIn}
                className="inline-flex items-center space-x-2 bg-cyan-50 text-cyan-600 px-4 py-2 rounded-full"
              >
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">AI-Powered Meeting Assistant</span>
              </motion.div>

              <h1 className="text-4xl font-bold tracking-tight">
                Transform Your{" "}
                <span className="bg-gradient-to-r from-cyan-600 to-cyan-500 bg-clip-text text-transparent">
                  Meetings
                </span>{" "}
                With AI
              </h1>

              <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                Empower every conversation with intelligent transcription, instant
                summaries, and actionable insights — designed to make teamwork
                faster and smarter.
              </p>
            </div>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate("/signup")}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="group relative bg-gradient-to-r from-cyan-600 to-cyan-500 text-white px-8 py-3 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Start Free Trial
                  <motion.div
                    animate={{ x: isHovered ? 5 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-cyan-400"
                  initial={{ x: "-100%" }}
                  animate={{ x: isHovered ? "0%" : "-100%" }}
                  transition={{ duration: 0.3 }}
                />
              </button>

              <button className="px-8 py-3 rounded-xl font-semibold text-lg border-2 border-gray-200 text-gray-700 hover:border-cyan-200 hover:bg-cyan-50 transition-all duration-300">
                <span className="flex items-center justify-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Watch Demo
                </span>
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            variants={scaleIn}
            className="lg:w-1/2 relative"
          >
            <div className="relative bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-100">
              <div className="absolute -top-3 -right-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500 rounded-full blur-lg opacity-30 animate-pulse" />
                  <div className="relative p-3 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  AI-Powered Meeting Assistant
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Auto-transcribe your meetings, extract key tasks, and generate
                  professional minutes within seconds — no manual notes ever again.
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                    <span className="text-sm text-gray-600">Real-time Transcription</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                    <span className="text-sm text-gray-600">Smart Summaries</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                    <span className="text-sm text-gray-600">Task Automation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                    <span className="text-sm text-gray-600">Team Collaboration</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Background decorative elements */}
            <motion.div
              className="absolute -z-10 -top-6 -left-6 w-64 h-64 bg-gradient-to-br from-cyan-100 to-transparent rounded-3xl blur-2xl"
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, 0]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-20">
        <motion.div variants={containerVariants}>
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for{" "}
              <span className="bg-gradient-to-r from-cyan-600 to-cyan-500 bg-clip-text text-transparent">
                Productive Meetings
              </span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Transform your meeting workflow with our comprehensive suite of AI-powered tools
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <FeatureCard
              title="Real-Time Transcription"
              desc="Live captions that keep everyone aligned — accurate, fast, and multilingual. Supports 50+ languages with industry-leading accuracy."
              icon={<Mic className="w-8 h-8" />}
              delay={0}
            />
            <FeatureCard
              title="AI Minutes of Meeting"
              desc="Instant, shareable summaries highlighting decisions and action items. Export to PDF, Google Docs, or Notion."
              icon={<FileText className="w-8 h-8" />}
              delay={0.1}
            />
            <FeatureCard
              title="Smart Task Extraction"
              desc="Automatic detection of to-dos, ownership, and follow-ups for your team. Integrates with Jira, Asana, and Slack."
              icon={<CheckSquare className="w-8 h-8" />}
              delay={0.2}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works Section - Enhanced Version */}
      <section id="how-it-works" className="container mx-auto px-4 sm:px-6 py-16 md:py-6">
        <motion.div variants={containerVariants}>
          <motion.div
            variants={itemVariants}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It{" "}
              <span className="bg-gradient-to-r from-cyan-600 to-cyan-500 bg-clip-text text-transparent">
                Works
              </span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Get started in minutes with our intuitive 4-step process
            </p>
          </motion.div>

          <div className="relative max-w-6xl mx-auto">
            {/* Timeline line - hidden on mobile, shown on md+ */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-200 via-cyan-100 to-cyan-700 transform -translate-x-1/2" />

            {/* Mobile timeline line */}
            <div className="block lg:hidden absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-200 to-cyan-700" />

            <div className="space-y-4 md:space-y-6">
              {[
                {
                  step: 1,
                  title: "Sign Up & Connect",
                  description: "Create your account and connect your calendar",
                  icon: <UserPlus className="w-6 h-6" />,
                  color: "from-cyan-500 to-cyan-600"
                },
                {
                  step: 2,
                  title: "Start Meeting",
                  description: "Begin your meeting and let AI join automatically",
                  icon: <Video className="w-6 h-6" />,
                  color: "from-cyan-500 to-cyan-600"
                },
                {
                  step: 3,
                  title: "Real-Time Magic",
                  description: "Watch as AI transcribes and extracts insights live",
                  icon: <Zap className="w-6 h-6" />,
                  color: "from-cyan-500 to-cyan-600"
                },
                {
                  step: 4,
                  title: "Get Results",
                  description: "Receive summarized minutes and tasks instantly",
                  icon: <FileText className="w-6 h-6" />,
                  color: "from-cyan-500 to-cyan-600"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  className="relative"
                >
                  {/* Step number on timeline */}
                  <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <motion.div
                      className={`w-12 h-14 rounded-full bg-gradient-to-r ${item.color} flex items-center justify-center shadow-lg`}
                      whileHover={{ scale: 1.1 }}
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.3
                      }}
                    >
                      <div className="text-white font-bold text-lg">{item.step}</div>
                    </motion.div>
                  </div>

                  {/* Mobile step number */}
                  <div className="block lg:hidden absolute left-6 top-1/2 -translate-y-1/2 z-10">
                    <motion.div
                      className={`w-10 h-10 rounded-full bg-gradient-to-r ${item.color} flex items-center justify-center shadow-lg`}
                      whileHover={{ scale: 1.1 }}
                    >
                      <div className="text-white font-bold text-sm">{item.step}</div>
                    </motion.div>
                  </div>

                  <div className={`
              flex flex-col lg:flex-row items-center
              ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'}
              gap-4 md:gap-6 lg:gap-8
              ${index === 0 ? 'pt-0' : 'pt-0'}
              ${index === 3 ? 'pb-0' : 'pb-0'}
            `}>
                    {/* Left content - shows on left for even steps, right for odd steps */}
                    <div className={`
                lg:w-1/2 
                ${index % 2 === 0 ? 'lg:pr-12 lg:text-right' : 'lg:pl-12 lg:text-left'}
                pl-16 lg:pl-0
              `}>
                      <div className={`
                  bg-white rounded-2xl p-6 md:p-8 
                  shadow-lg hover:shadow-xl 
                  border border-gray-100 
                  transition-all duration-300
                  ${index % 2 === 0 ? 'lg:ml-auto' : 'lg:mr-auto'}
                  max-w-lg
                `}>
                        <div className="flex lg:hidden items-center space-x-4 mb-4">
                          <div className={`p-3 rounded-xl bg-gradient-to-r ${item.color}`}>
                            <div className="text-white">
                              {item.icon}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                            <p className="text-sm text-cyan-600">Step {item.step}</p>
                          </div>
                        </div>

                        <div className="hidden lg:block">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                          <p className="text-gray-600 leading-relaxed">{item.description}</p>
                        </div>

                        <div className="block lg:hidden">
                          <p className="text-gray-600 leading-relaxed">{item.description}</p>
                        </div>

                        {/* Decorative elements */}
                        <div className={`hidden lg:block absolute w-4 h-4 bg-white border border-gray-100 rotate-45 top-1/2 -translate-y-1/2 ${index % 2 === 0 ? '-right-2' : '-left-2'
                          }`} />
                      </div>
                    </div>

                    {/* Right content (hidden on desktop, shows icon on mobile) */}
                    <div className={`
                lg:w-1/2 
                ${index % 2 === 0 ? 'lg:pl-12' : 'lg:pr-12'}
                hidden lg:block
              `}>
                      <div className={`
                  ${index % 2 === 0 ? 'text-left' : 'text-right'}
                `}>
                        <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br from-cyan-50 to-white border border-cyan-100`}>
                          <div className="text-cyan-600">
                            {item.icon}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress indicator (mobile only) */}
                  {index < 3 && (
                    <div className="block lg:hidden absolute left-[26px] top-full h-4 w-0.5 bg-gradient-to-b from-cyan-100 to-cyan-50" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <motion.div
          variants={scaleIn}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-50 to-white border border-cyan-100"
        >
          {/* Background pattern */}
          {/* <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%2306b6d4" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
          </div> */}

          <div className="relative px-8 py-16 md:py-20 text-center">
            <motion.div
              animate={{
                y: [0, -5, 0],
                rotate: [0, 2, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-block mb-6"
            >
              <Sparkles className="w-12 h-12 text-cyan-600" />
            </motion.div>

            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ready to Make Every Meeting Count?
            </h3>
            <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of teams who have transformed their meeting culture with AI
            </p>

            <div className="flex justify-center">
              <button
                onClick={() => navigate("/signup")}
                className="group relative bg-gradient-to-r from-cyan-600 to-cyan-500 text-white px-8 py-3 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <span className="flex items-center justify-center gap-2">
                  Start Free — It's Instant
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>

            
          </div>
        </motion.div>
      </section>
    </motion.div>
  );
}