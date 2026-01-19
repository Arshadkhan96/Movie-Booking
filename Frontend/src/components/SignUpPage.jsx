import { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import {
  ArrowLeft,
  Calendar,
  Clapperboard,
  Eye,
  EyeOff,
  Film,
  Mail,
  Phone,
  Ticket,
  User,
  Lock,
} from "lucide-react";
import { signUpStyles } from "../assets/dummyStyles";
import axios from 'axios'

const API_BASE = 'http://localhost:5000/api/auth'

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    birthDate: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ✅ Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // ✅ Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Phone number must be 10 digits";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.birthDate) {
      newErrors.birthDate = "Birth date is required";
    } else {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 13) newErrors.birthDate = "You must be at least 13 years old";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  

  // ✅ Go Back Function
  const goBack = () => window.history.back();

  // ✅ Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the form errors.");
      return;
    }

    console.log("Form Data:", {
      ...formData,
      password: "***" + formData.password.slice(-2),
    });
    setIsLoading(true);

    try {
      const payload = {
         fullName: formData.fullName.trim(),
        userName: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        birthDate: formData.birthDate,
        password: formData.password,
      };
      const response = await axios.post(`${API_BASE}/register`,payload,{
        headers: {'Content-Type':'application/json'},
      })
      if(response.data && response.data.success){
        toast.success('Account Created Successfully! Redirecting to Login....');

        if(response.data.token){
          localStorage.setItem('token', response.data.token);
        }
        if(response.data.user){
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        setTimeout(()=>{
          window.location.href = '/login';  
        }, 1200);
      }else{
          toast.error(response.data?.message || "Registration Failed.")
        }
      }
     catch (err) {
      console.error("Registration error:", err);
      // If backend returned an error message, try to map it to a field
      const serverMsg =
        err?.response?.data?.message || err?.message || "Server error";

      // Map common backend messages to the form fields
      if (serverMsg.toLowerCase().includes("email")) {
        setErrors((prev) => ({ ...prev, email: serverMsg }));
      } else if (serverMsg.toLowerCase().includes("username")) {
        setErrors((prev) => ({ ...prev, username: serverMsg }));
      } else if (serverMsg.toLowerCase().includes("phone")) {
        setErrors((prev) => ({ ...prev, phone: serverMsg }));
      } else {
        toast.error(serverMsg);
      }
    } finally{
      setIsLoading(false)
    }
  };

  return (
    <div className={signUpStyles.container}>
      {/* 🔹 Animated Particles Background */}
      <div className={signUpStyles.particlesContainer}>
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className={signUpStyles.particle}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          ></div>
        ))}
      </div>

      {/* 🔹 Gradient Orbs */}
      <div className={signUpStyles.gradientOrbs}>
        <div className={signUpStyles.orb1}></div>
        <div className={signUpStyles.orb2}></div>
      </div>

      {/* 🔹 Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        draggable
        pauseOnHover
        theme="dark"
      />

      {/* 🔹 Main SignUp Card */}
      <div className={signUpStyles.mainContent}>
        {/* Centered Back Button */}
        <button onClick={goBack} className={signUpStyles.backButton}>
          <ArrowLeft size={20} className={signUpStyles.backIcon} />
          <span className={signUpStyles.backText}>BACK</span>
        </button>

        <div className={signUpStyles.card}>
          <div className={signUpStyles.cardHeader}></div>

          <div className={signUpStyles.cardContent}>
            <div className={signUpStyles.header}>
              <div className={signUpStyles.headerFlex}>
                <Ticket className={signUpStyles.headerIcon} size={32} />
                <h2 className={signUpStyles.headerTitle}>JOIN OUR SINEMA</h2>
              </div>
              <p className={signUpStyles.headerSubtitle}>
                Create your account and start your cinematic journey.
              </p>
            </div>

            {/* ✅ Signup Form */}
            <form onSubmit={handleSubmit} className={signUpStyles.form}>
              {/* First Row */}
              <div className={signUpStyles.formGrid}>
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className={signUpStyles.field}>
                    FULL NAME
                  </label>
                  <div className={signUpStyles.inputContainer}>
                    <input
                      type="text"
                      name="fullName"
                      id="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className={`${signUpStyles.input.base} ${
                        errors.fullName
                          ? signUpStyles.input.error
                          : signUpStyles.input.normal
                      } ${signUpStyles.inputWithIcon}`}
                      placeholder="Enter your full name"
                    />
                    <div className={signUpStyles.inputIcon}>
                      <User size={18} />
                    </div>
                  </div>
                  {errors.fullName && (
                    <p className={signUpStyles.errorText}>{errors.fullName}</p>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label htmlFor="username" className={signUpStyles.field}>
                    USERNAME
                  </label>
                  <div className={signUpStyles.inputContainer}>
                    <input
                      type="text"
                      name="username"
                      id="username"
                      value={formData.username}
                      onChange={handleChange}
                      className={`${signUpStyles.input.base} ${
                        errors.username
                          ? signUpStyles.input.error
                          : signUpStyles.input.normal
                      } ${signUpStyles.inputWithIcon}`}
                      placeholder="Choose a username"
                    />
                    <div className={signUpStyles.inputIcon}>
                      <Clapperboard size={18} />
                    </div>
                  </div>
                  {errors.username && (
                    <p className={signUpStyles.errorText}>{errors.username}</p>
                  )}
                </div>
              </div>

              {/* Second Row */}
              <div className={signUpStyles.formGrid}>
                {/* Email */}
                <div>
                  <label htmlFor="email" className={signUpStyles.field}>
                    EMAIL ADDRESS
                  </label>
                  <div className={signUpStyles.inputContainer}>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`${signUpStyles.input.base} ${
                        errors.email
                          ? signUpStyles.input.error
                          : signUpStyles.input.normal
                      } ${signUpStyles.inputWithIcon}`}
                      placeholder="your@example.com"
                    />
                    <div className={signUpStyles.inputIcon}>
                      <Mail size={18} />
                    </div>
                  </div>
                  {errors.email && (
                    <p className={signUpStyles.errorText}>{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className={signUpStyles.field}>
                    PHONE NUMBER
                  </label>
                  <div className={signUpStyles.inputContainer}>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`${signUpStyles.input.base} ${
                        errors.phone
                          ? signUpStyles.input.error
                          : signUpStyles.input.normal
                      } ${signUpStyles.inputWithIcon}`}
                      placeholder="+1 (555) 123-4567"
                    />
                    <div className={signUpStyles.inputIcon}>
                      <Phone size={18} />
                    </div>
                  </div>
                  {errors.phone && (
                    <p className={signUpStyles.errorText}>{errors.phone}</p>
                  )}
                </div>
              </div>

              {/* Third Row */}
              <div className={signUpStyles.formGrid}>
                {/* Birth Date */}
                <div>
                  <label htmlFor="birthDate" className={signUpStyles.field}>
                    DATE OF BIRTH
                  </label>
                  <div className={signUpStyles.inputContainer}>
                    <input
                      type="date"
                      name="birthDate"
                      id="birthDate"
                      value={formData.birthDate}
                      onChange={handleChange}
                      className={`${signUpStyles.input.base} ${
                        errors.birthDate
                          ? signUpStyles.input.error
                          : signUpStyles.input.normal
                      } ${signUpStyles.inputWithIcon}`}
                    />
                    <div className={signUpStyles.inputIcon}>
                      <Calendar size={18} />
                    </div>
                  </div>
                  {errors.birthDate && (
                    <p className={signUpStyles.errorText}>
                      {errors.birthDate}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className={signUpStyles.field}>
                    PASSWORD
                  </label>
                  <div className={signUpStyles.inputContainer}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      id="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`${signUpStyles.input.base} ${
                        errors.password
                          ? signUpStyles.input.error
                          : signUpStyles.input.normal
                      } ${signUpStyles.inputWithToggle}`}
                      placeholder="Create a strong password"
                    />
                    <div className={signUpStyles.inputIcon}>
                      <Lock size={18} />
                    </div>

                    <button
                      type="button"
                      className={signUpStyles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={18} className={signUpStyles.toggleIcon} />
                      ) : (
                        <Eye size={18} className={signUpStyles.toggleIcon} />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className={signUpStyles.errorText}>{errors.password}</p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className={signUpStyles.submitContainer}>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`${signUpStyles.submitButton.base} ${
                    isLoading ? signUpStyles.submitButton.loading : ""
                  }`}
                >
                  {isLoading ? (
                    <div className={signUpStyles.submitContent}>
                      <div className={signUpStyles.loadingSpinner}></div>
                      CREATING YOUR ACCOUNT...
                    </div>
                  ) : (
                    <div className={signUpStyles.submitContent}>
                      <Film className={signUpStyles.submitIcon} size={20} />
                      <span className="font-cinema">
                        CREATE CINEMA ACCOUNT
                      </span>
                    </div>
                  )}
                </button>
              </div>
            </form>
            <div className={signUpStyles.loginContainer}>
                <p className={signUpStyles.loginText}>
                    Already have an account?{' '}
                    <a href="/login" className={signUpStyles.loginLink}>
                    Sign in to your account
                    </a>
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
