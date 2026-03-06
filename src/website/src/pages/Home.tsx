import { Link } from 'react-router-dom'
import {
  ShoppingCart,
  Package,
  Users,
  FileText,
  Shield,
  Zap,
  Globe,
  Clock,
  ArrowRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'

const features = [
  {
    name: 'Sales Management',
    description: 'End-to-end sales cycle from leads to invoicing with customer relationship tracking.',
    icon: ShoppingCart,
    color: 'bg-green-500',
  },
  {
    name: 'Procurement',
    description: 'Streamlined purchasing with vendor management, POs, and 3-way matching.',
    icon: FileText,
    color: 'bg-purple-500',
  },
  {
    name: 'Inventory Control',
    description: 'Real-time stock tracking, warehouse management, and automated reorder alerts.',
    icon: Package,
    color: 'bg-orange-500',
  },
  {
    name: 'Logistics Tracking',
    description: 'Track deliveries, distances, and quantities with comprehensive dashboards.',
    icon: Package,
    color: 'bg-blue-500',
  },
  {
    name: 'User Management',
    description: 'Role-based access control with granular permissions and audit logging.',
    icon: Users,
    color: 'bg-pink-500',
  },
  {
    name: 'Reporting & Analytics',
    description: 'Comprehensive reports with export to Excel/PDF and role-based dashboards.',
    icon: FileText,
    color: 'bg-indigo-500',
  },
]

const benefits = [
  { text: 'Increase operational efficiency by up to 40%', icon: Zap },
  { text: 'Real-time visibility across all operations', icon: Globe },
  { text: 'Reduce manual data entry by 80%', icon: Clock },
  { text: 'Enterprise-grade security & compliance', icon: Shield },
]

const revenueData = [
  { month: 'Jan', revenue: 850000 },
  { month: 'Feb', revenue: 920000 },
  { month: 'Mar', revenue: 1100000 },
  { month: 'Apr', revenue: 980000 },
  { month: 'May', revenue: 1250000 },
  { month: 'Jun', revenue: 1400000 },
]

const productData = [
  { name: 'Electronics', value: 35, fill: '#3b82f6' },
  { name: 'Clothing', value: 25, fill: '#22c55e' },
  { name: 'Food & Beverages', value: 20, fill: '#f59e0b' },
  { name: 'Others', value: 20, fill: '#8b5cf6' },
]

const ordersData = [
  { month: 'Jan', orders: 245 },
  { month: 'Feb', orders: 312 },
  { month: 'Mar', orders: 428 },
  { month: 'Apr', orders: 389 },
  { month: 'May', orders: 521 },
  { month: 'Jun', orders: 634 },
]

export default function Home() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-50 via-white to-primary-50 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[600px] h-[600px] bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[400px] h-[400px] bg-accent-200/30 rounded-full blur-3xl" />
        
        <div className="container-custom section-padding relative">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-3 py-1.5 rounded-full text-xs font-medium mb-4">
              <Zap className="w-3.5 h-3.5" />
              Now with AI-powered analytics
            </div>
            
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-4">
              The Complete ERP Solution for{' '}
              <span className="gradient-text">Modern Businesses</span>
            </h1>
            
            <p className="text-base sm:text-lg text-gray-600 mb-6 max-w-2xl mx-auto text-balance">
              Streamline your entire operation with AppSire ERP. Sales, inventory, 
              procurement, logistics — all in one powerful, cloud-based platform built for growth.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Link to="/connect" className="btn-primary">
                Connect with Us
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
          
          {/* Hero Image/Dashboard Preview */}
          <div className="mt-12 relative animate-slide-up">
            <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl shadow-2xl shadow-gray-900/20 overflow-hidden border border-gray-700">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-4 text-sm text-gray-400">AppSire ERP Dashboard</span>
              </div>
              <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-50">
                <div className="grid grid-cols-4 gap-4 mb-4">
                  {[
                    { label: 'Revenue', value: '₹12.4L', change: '+12%', color: 'text-green-600' },
                    { label: 'Orders', value: '3,421', change: '+8%', color: 'text-green-600' },
                    { label: 'Customers', value: '1,284', change: '+24%', color: 'text-green-600' },
                    { label: 'Products', value: '847', change: '+3%', color: 'text-green-600' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                      <p className="text-xs text-gray-500">{stat.label}</p>
                      <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                      <p className={`text-xs ${stat.color}`}>{stat.change}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100 h-48">
                    <p className="text-sm font-medium text-gray-700 mb-2">Revenue Trend (₹)</p>
                    <ResponsiveContainer width="100%" height="85%">
                      <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                        <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']} />
                        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 h-48">
                    <p className="text-sm font-medium text-gray-700 mb-2">Top Categories</p>
                    <ResponsiveContainer width="100%" height="85%">
                      <PieChart>
                        <Pie data={productData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={false}>
                          {productData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-gradient-to-t from-transparent to-gray-200/50 blur-xl" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Everything you need to run your business
            </h2>
            <p className="text-base text-gray-600">
              From sales to fulfillment, AppSire ERP gives you complete control over every aspect 
              of your operations in one unified platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card card-hover group"
              >
                <div className={`w-10 h-10 ${feature.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1.5">{feature.name}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/features" className="btn-secondary">
              Explore All Features
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Why businesses choose AppSire ERP
              </h2>
              <p className="text-base text-gray-600 mb-6">
                Experience the power of a modern ERP solution crafted with precision and innovation. 
                We're building the future of business management — simple, powerful, and reliable.
              </p>
              
              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                    <div>
                      <p className="text-xs text-gray-500">Monthly Revenue</p>
                      <p className="text-xl font-bold text-gray-900">₹28,43,920</p>
                    </div>
                    <div className="text-green-600 text-xs font-medium">+23.5%</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div>
                      <p className="text-xs text-gray-500">Orders Processed</p>
                      <p className="text-xl font-bold text-gray-900">12,847</p>
                    </div>
                    <div className="text-blue-600 text-xs font-medium">+18.2%</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <div>
                      <p className="text-xs text-gray-500">Inventory Accuracy</p>
                      <p className="text-xl font-bold text-gray-900">99.8%</p>
                    </div>
                    <div className="text-purple-600 text-xs font-medium">+5.3%</div>
                  </div>
                </div>
              </div>
              <div className="absolute -z-10 top-4 left-4 w-full h-full bg-primary-200 rounded-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Preview Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Powerful Analytics at Your Fingertips
            </h2>
            <p className="text-base text-gray-600">
              Make data-driven decisions with real-time insights and comprehensive reporting.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-lg">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Monthly Orders</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ordersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-lg">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Revenue by Category</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={productData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {productData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-500/30 rounded-full blur-3xl" />
        
        <div className="container-custom relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-4">
              Let's Build Your Business Together
            </h2>
            <p className="text-base text-primary-100 mb-6">
              We're here to help you streamline operations and grow your business. 
              Connect with us to learn how AppSire ERP can transform your workflow.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/connect" className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-primary-700 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-all duration-200 hover:-translate-y-0.5">
                Connect with Us
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
