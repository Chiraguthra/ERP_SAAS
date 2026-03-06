import { useState } from 'react'
import {
  Mail,
  Phone,
  Clock,
  Send,
  CheckCircle2,
  MessageSquare,
  HelpCircle,
  Users,
  Building2,
} from 'lucide-react'

const contactMethods = [
  {
    icon: Mail,
    title: 'Email',
    description: 'Send us an email anytime',
    value: 'connect.appsire@gmail.com',
    href: 'mailto:connect.appsire@gmail.com',
  },
  {
    icon: Phone,
    title: 'Phone',
    description: 'Mon-Fri from 9am to 6pm IST',
    value: '+91 8376980873',
    href: 'tel:+918376980873',
  },
  {
    icon: Clock,
    title: 'Business Hours',
    description: 'When we\'re available',
    value: 'Monday - Friday, 9:00 AM - 6:00 PM IST',
    href: '#',
  },
]

const topics = [
  { value: 'sales', label: 'Sales Inquiry', icon: Users },
  { value: 'support', label: 'Technical Support', icon: HelpCircle },
  { value: 'demo', label: 'Request a Demo', icon: MessageSquare },
  { value: 'partnership', label: 'Partnership', icon: Building2 },
  { value: 'other', label: 'Other', icon: Mail },
]

const API_URL = import.meta.env.VITE_API_URL || ''

export default function Contact() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    topic: '',
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
          message: `Topic: ${formData.topic}\n\n${formData.message}`,
          source: 'contact_form',
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit')
      }
      
      setIsSubmitted(true)
    } catch (err) {
      setError('Failed to submit form. Please try again or email us directly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-50 via-white to-primary-50 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="container-custom section-padding relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Get in{' '}
              <span className="gradient-text">Touch</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Have questions about AppSire ERP? Want to see a demo? Our team is here to help. 
              Reach out and we'll get back to you within 24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="section-padding bg-white -mt-8">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-6 mb-16 max-w-4xl mx-auto">
            {contactMethods.map((method, index) => (
              <a
                key={index}
                href={method.href}
                className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all group"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                  <method.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{method.title}</h3>
                <p className="text-sm text-gray-500 mb-2">{method.description}</p>
                <p className="text-sm text-primary-600 font-medium">{method.value}</p>
              </a>
            ))}
          </div>

          {/* Contact Form Section */}
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-lg">
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-8 h-8 text-accent-600" />
                    </div>
                    <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">
                      Thank You!
                    </h2>
                    <p className="text-gray-600 max-w-md mx-auto mb-8">
                      Your message has been sent successfully. Our team will review your inquiry 
                      and get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => {
                        setIsSubmitted(false)
                        setFormData({
                          firstName: '',
                          lastName: '',
                          email: '',
                          company: '',
                          phone: '',
                          topic: '',
                          message: '',
                        })
                      }}
                      className="btn-secondary"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
                      Send us a message
                    </h2>
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
                            placeholder="John"
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
                            placeholder="Doe"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email *
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="input-field"
                            placeholder="john@company.com"
                          />
                        </div>
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                            Phone
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="+91 98765 43210"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                          Company
                        </label>
                        <input
                          type="text"
                          id="company"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          className="input-field"
                          placeholder="Your company name"
                        />
                      </div>

                      <div>
                        <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                          Topic *
                        </label>
                        <select
                          id="topic"
                          name="topic"
                          value={formData.topic}
                          onChange={handleChange}
                          required
                          className="input-field"
                        >
                          <option value="">Select a topic</option>
                          {topics.map((topic) => (
                            <option key={topic.value} value={topic.value}>
                              {topic.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                          Message *
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          required
                          rows={5}
                          className="input-field resize-none"
                          placeholder="Tell us how we can help you..."
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary w-full disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Send Message
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Links */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
                <ul className="space-y-3">
                  <li>
                    <a href="/features" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      View Features
                    </a>
                  </li>
                  <li>
                    <a href="/connect" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Connect with Us
                    </a>
                  </li>
                </ul>
              </div>

              {/* Call Us */}
              <div className="bg-gray-900 rounded-2xl p-6 text-white">
                <h3 className="font-semibold mb-2">Prefer to Call?</h3>
                <p className="text-sm text-gray-300 mb-4">
                  We're available Monday to Friday, 9 AM to 6 PM IST. Give us a call to discuss your needs.
                </p>
                <a
                  href="tel:+918376980873"
                  className="inline-flex items-center text-primary-300 hover:text-primary-200 text-sm font-medium"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  +91 8376980873
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
