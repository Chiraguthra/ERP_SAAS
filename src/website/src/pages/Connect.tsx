import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail,
  Phone,
  Send,
  CheckCircle2,
  ArrowRight,
  Building2,
  Users,
  Briefcase,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function Connect() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    employeeCount: '',
    message: '',
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    
    try {
      const response = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          message: `Employee Count: ${formData.employeeCount}\n\n${formData.message}`,
          source: 'connect_form',
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit')
      }
      
      setIsSubmitted(true)
    } catch (err) {
      setError('Failed to submit form. Please try again or email us directly at connect.appsire@gmail.com')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 to-primary-800 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-500/30 rounded-full blur-3xl" />
        
        <div className="container-custom section-padding relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-6">
              Connect with Us
            </h1>
            <p className="text-lg text-primary-100 max-w-2xl mx-auto">
              Let's discuss how AppSire ERP can transform your business operations. 
              Fill out the form below and our team will get back to you within 24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="section-padding bg-gray-50 -mt-8">
        <div className="container-custom">
          <div className="grid lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-xl -mt-16 relative z-10">
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10 text-accent-600" />
                    </div>
                    <h2 className="font-display text-3xl font-bold text-gray-900 mb-4">
                      Thank You!
                    </h2>
                    <p className="text-gray-600 max-w-md mx-auto mb-8">
                      We've received your information and are excited to connect with you. 
                      Our team will reach out within 24 hours to discuss your needs.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link to="/features" className="btn-primary">
                        Explore Features
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Link>
                      <button
                        onClick={() => {
                          setIsSubmitted(false)
                          setFormData({
                            firstName: '',
                            lastName: '',
                            email: '',
                            phone: '',
                            company: '',
                            employeeCount: '',
                            message: '',
                          })
                        }}
                        className="btn-secondary"
                      >
                        Submit Another
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
                        Tell us about yourself
                      </h2>
                      <p className="text-gray-600">
                        We'd love to learn more about your business and how we can help.
                      </p>
                    </div>
                    
                    {error && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                      </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                            First Name *
                          </label>
                          <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                            className="input-field"
                            placeholder="Your first name"
                          />
                        </div>
                        <div>
                          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name
                          </label>
                          <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Your last name"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Work Email *
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="input-field"
                            placeholder="you@company.com"
                          />
                        </div>
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            className="input-field"
                            placeholder="+91 98765 43210"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                            Company Name *
                          </label>
                          <input
                            type="text"
                            id="company"
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            required
                            className="input-field"
                            placeholder="Your company name"
                          />
                        </div>
                        <div>
                          <label htmlFor="employeeCount" className="block text-sm font-medium text-gray-700 mb-2">
                            Number of Employees
                          </label>
                          <select
                            id="employeeCount"
                            name="employeeCount"
                            value={formData.employeeCount}
                            onChange={handleChange}
                            className="input-field"
                          >
                            <option value="">Select range</option>
                            <option value="1-10">1-10 employees</option>
                            <option value="11-50">11-50 employees</option>
                            <option value="51-200">51-200 employees</option>
                            <option value="201-500">201-500 employees</option>
                            <option value="500+">500+ employees</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                          How can we help you?
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          rows={4}
                          className="input-field resize-none"
                          placeholder="Tell us about your business needs, challenges, or questions..."
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary w-full py-4 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Connect with Us
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Why Connect */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-600 font-semibold text-sm">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">We'll review your needs</p>
                      <p className="text-sm text-gray-500">Within 24 hours</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-600 font-semibold text-sm">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Schedule a demo call</p>
                      <p className="text-sm text-gray-500">Personalized walkthrough</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-600 font-semibold text-sm">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Get a custom proposal</p>
                      <p className="text-sm text-gray-500">Tailored to your business</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-900 rounded-2xl p-6 text-white">
                <h3 className="font-semibold mb-4">Prefer direct contact?</h3>
                <div className="space-y-4">
                  <a
                    href="mailto:connect.appsire@gmail.com"
                    className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors"
                  >
                    <Mail className="w-5 h-5 text-primary-400" />
                    <span className="text-sm">connect.appsire@gmail.com</span>
                  </a>
                  <a
                    href="tel:+918376980873"
                    className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors"
                  >
                    <Phone className="w-5 h-5 text-primary-400" />
                    <span className="text-sm">+91 8376980873</span>
                  </a>
                </div>
              </div>

              {/* Trust indicators */}
              <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100">
                <h3 className="font-semibold text-gray-900 mb-4">Why AppSire ERP?</h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-gray-700">
                    <Building2 className="w-5 h-5 text-primary-600" />
                    Built for growing businesses
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-700">
                    <Users className="w-5 h-5 text-primary-600" />
                    Dedicated support team
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-700">
                    <Briefcase className="w-5 h-5 text-primary-600" />
                    Flexible pricing plans
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
