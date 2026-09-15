"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthDialog({ isOpen, onClose }: AuthDialogProps) {
  const router = useRouter();
  const { businessName } = useSiteSettings();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [carouselImages, setCarouselImages] = useState<string[]>([]);

  // Dynamically load carousel images from API, only once actually opened
  useEffect(() => {
    if (!isOpen || carouselImages.length > 0) return;

    const loadCarouselImages = async () => {
      try {
        const response = await fetch("/api/carousel-images");
        const data = await response.json();
        if (data.images && data.images.length > 0) {
          setCarouselImages(data.images);
        } else {
          // Fallback images if API fails
          setCarouselImages([
            "/assets/pictures/loginCoursels/1_1_4c720205-d49a-4e6b-8a29-b80b95829124.jpg.jpeg",
            "/assets/pictures/loginCoursels/54_e9aa498c-58a5-45fc-841e-e795bb0fb089.jpg.jpeg",
            "/assets/pictures/loginCoursels/100_7ff6ea3e-945c-4211-9b0f-885b430f14ac.jpg.jpeg",
          ]);
        }
      } catch (error) {
        console.error("Failed to load carousel images:", error);
        // Fallback images
        setCarouselImages([
          "/assets/pictures/loginCoursels/1_1_4c720205-d49a-4e6b-8a29-b80b95829124.jpg.jpeg",
          "/assets/pictures/loginCoursels/54_e9aa498c-58a5-45fc-841e-e795bb0fb089.jpg.jpeg",
          "/assets/pictures/loginCoursels/100_7ff6ea3e-945c-4211-9b0f-885b430f14ac.jpg.jpeg",
        ]);
      }
    };

    loadCarouselImages();
  }, [isOpen, carouselImages.length]);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupMobile, setSignupMobile] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupMethod, setSignupMethod] = useState<"email" | "mobile">("email");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        identifier: loginIdentifier,
        password: loginPassword,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email/mobile or password");
      } else {
        onClose();
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          email: signupMethod === "email" ? signupEmail : null,
          mobile: signupMethod === "mobile" ? signupMobile : null,
          password: signupPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Signup failed");
        setIsLoading(false);
        return;
      }

      // Auto login after signup
      const result = await signIn("credentials", {
        identifier: signupMethod === "email" ? signupEmail : signupMobile,
        password: signupPassword,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but login failed. Please try logging in.");
      } else {
        onClose();
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", {
        callbackUrl: "/",
        redirect: true,
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      setError("Failed to sign in with Google");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[95vw] md:!max-w-4xl lg:!max-w-6xl w-full max-h-[90vh] p-0 overflow-hidden border-0 shadow-2xl rounded-xl">
        <div className="grid md:grid-cols-2 w-full h-full">
          {/* Left Panel - Image/Illustration */}
          <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-8 overflow-hidden">
            <div className="w-full h-full flex flex-col justify-center space-y-6">
              {/* Jewelry Image Carousel - Full Space */}
              <div className="flex-1 flex items-center justify-center">
                {carouselImages.length > 0 ? (
                  <Carousel
                    opts={{
                      align: "center",
                      loop: true,
                    }}
                    plugins={[
                      Autoplay({
                        delay: parseInt(
                          process.env.NEXT_PUBLIC_CAROUSEL_AUTOPLAY_DELAY ||
                            "3000"
                        ),
                        stopOnInteraction: false,
                      }),
                    ]}
                    className="w-full h-full"
                  >
                    <CarouselContent className="h-full">
                      {carouselImages.map((image, index) => (
                        <CarouselItem
                          key={index}
                          className="h-full flex items-center justify-center"
                        >
                          <div className="relative w-full h-full min-h-[500px] max-h-[600px]">
                            <Image
                              src={image}
                              alt={`${businessName} Jewelry ${index + 1}`}
                              fill
                              className="object-contain drop-shadow-2xl transition-transform duration-700 hover:scale-105"
                              priority={index === 0}
                              sizes="(max-width: 768px) 100vw, 50vw"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
                  </div>
                )}
              </div>

              {/* Branding Text */}
              <div className="text-center space-y-3 pb-4">
                <h2 className="text-4xl font-bold text-gray-800">
                  {businessName}
                </h2>
                <p className="text-lg text-gray-700">
                  Exquisite jewelry for every moment
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel - Form */}
          <div className="flex flex-col items-center justify-center bg-white p-12 overflow-y-auto">
            <div className="w-full max-w-md">
              {/* Logo/Title */}
              <div className="text-center mb-8">
                <h1
                  className="text-4xl font-bold text-gray-900 mb-3"
                  style={{ fontFamily: "cursive" }}
                >
                  {businessName}
                </h1>
              </div>

              {/* Welcome Text */}
              <h3 className="text-2xl font-semibold text-gray-800 mb-8 text-center">
                Welcome to {businessName}
              </h3>

              {/* Tab Switch */}
              <div className="flex mb-6">
                <button
                  onClick={() => setActiveTab("login")}
                  className={`flex-1 py-2 text-center font-medium transition-colors ${
                    activeTab === "login"
                      ? "text-amber-600 border-b-2 border-amber-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setActiveTab("signup")}
                  className={`flex-1 py-2 text-center font-medium transition-colors ${
                    activeTab === "signup"
                      ? "text-amber-600 border-b-2 border-amber-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Login Form */}
              {activeTab === "login" && (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Email or Mobile Number
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter your email or mobile"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full h-11 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full h-11 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {error && (
                    <p className="text-red-600 text-sm text-center">{error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-full transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>

                  <div className="text-center">
                    <a
                      href="#"
                      className="text-sm text-gray-600 hover:text-amber-600"
                    >
                      Forgot password?
                    </a>
                  </div>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full h-12 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-md flex items-center justify-center gap-3"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Sign in with Google
                  </Button>
                </form>
              )}

              {/* Signup Form */}
              {activeTab === "signup" && (
                <form onSubmit={handleSignup} className="space-y-5">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Full Name
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter your full name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="w-full h-11 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Sign up with
                    </label>
                    <div className="flex gap-2 mb-3">
                      <Button
                        type="button"
                        variant={
                          signupMethod === "email" ? "default" : "outline"
                        }
                        onClick={() => setSignupMethod("email")}
                        className={`flex-1 ${
                          signupMethod === "email"
                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                            : "border-gray-300 text-gray-700"
                        }`}
                      >
                        Email
                      </Button>
                      <Button
                        type="button"
                        variant={
                          signupMethod === "mobile" ? "default" : "outline"
                        }
                        onClick={() => setSignupMethod("mobile")}
                        className={`flex-1 ${
                          signupMethod === "mobile"
                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                            : "border-gray-300 text-gray-700"
                        }`}
                      >
                        Mobile
                      </Button>
                    </div>
                  </div>

                  {signupMethod === "email" ? (
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="w-full h-11 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">
                        Mobile Number
                      </label>
                      <Input
                        type="tel"
                        placeholder="10 digit mobile number"
                        value={signupMobile}
                        onChange={(e) => setSignupMobile(e.target.value)}
                        className="w-full h-11 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        pattern="[0-9]{10}"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">
                      Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="w-full h-11 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      minLength={6}
                      required
                    />
                  </div>

                  {error && (
                    <p className="text-red-600 text-sm text-center">{error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold rounded-full transition-all shadow-md hover:shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full h-10 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-md flex items-center justify-center gap-3"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Sign up with Google
                  </Button>

                  <p className="text-center text-sm text-gray-600 mt-4">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("login")}
                      className="text-amber-600 hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
