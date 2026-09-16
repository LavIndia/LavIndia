"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Image from "next/image";
import { Loader2, ShieldCheck } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";
import { css, cx } from "styled-system/css";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Runs right after a successful login or signup, before onClose. */
  onAuthSuccess?: () => void;
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
const OTP_RESEND_SECONDS = 30;

const contentStyle = css({
  maxWidth: { base: "95vw", md: "50rem", lg: "74rem" },
  width: "full",
  // The generic DialogContent wrapper (src/components/ui/dialog.tsx)
  // applies its own maxHeight:90vh + overflowY:auto to the outer AriaModal
  // for plain dialogs. This auth dialog manages its own internal scroll
  // region (formPanelStyle) instead, so these must explicitly win over
  // that shorthand/longhand pair regardless of stylesheet source order.
  maxHeight: "96vh",
  overflow: "hidden",
  overflowY: "hidden",
  padding: "0",
  borderRadius: "xl",
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
  width: "full",
  height: "full",
});

// Full-bleed photo, no colored padding/frame around it — the image itself
// carries the elegance, with the brand mark as a soft gradient caption
// over its base rather than a separate boxed-in section.
const imagePanelStyle = css({
  display: { base: "none", md: "block" },
  position: "relative",
  overflow: "hidden",
  background: "bg.canvas",
});

const carouselWrapStyle = css({ position: "absolute", inset: 0 });
const carouselSlideStyle = css({ position: "relative", height: "full", width: "full" });
const carouselImageStyle = css({ objectFit: "cover" });
const carouselLoadingStyle = css({ display: "flex", alignItems: "center", justifyContent: "center", height: "full" });

const brandingStyle = css({
  position: "absolute",
  insetX: 0,
  bottom: 0,
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: "1.5",
  paddingInline: "8",
  paddingTop: "16",
  paddingBottom: "8",
  background: "linear-gradient(to top, rgba(20,16,12,0.72), rgba(20,16,12,0.28) 55%, transparent)",
});
const brandingTitleStyle = css({ fontFamily: "display", fontSize: "3xl", fontWeight: "semibold", color: "white" });
const brandingSubtitleStyle = css({ fontSize: "md", color: "rgba(255,255,255,0.82)" });

const formPanelStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "bg.surface",
  padding: { base: "4", md: "6" },
  // A luxury dialog should never look like it's scrolling — the layout is
  // sized to fit, and this is only a safety net for very short viewports,
  // so the scrollbar chrome itself stays invisible.
  overflowY: "auto",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
});

const formInnerStyle = css({ width: "full", maxWidth: "26rem" });

const welcomeTextStyle = css({ fontFamily: "display", fontSize: "lg", fontWeight: "semibold", color: "fg.default", textAlign: "center", marginBottom: "3" });

const tabRowStyle = css({ display: "flex", marginBottom: "3", borderBottom: "1px solid", borderColor: "border.subtle" });

const tabButtonStyle = cx(
  css({
    flex: "1",
    paddingBlock: "2.5",
    textAlign: "center",
    fontFamily: "body",
    fontWeight: "medium",
    fontSize: "sm",
    color: "fg.muted",
    background: "transparent",
    cursor: "pointer",
    outline: "none",
    borderBottom: "2px solid transparent",
    transition: "color 0.15s ease, border-color 0.15s ease",
    "&:hover, &[data-hovered]": { color: "fg.default" },
    "&[data-focus-visible]": { boxShadow: "0 0 0 3px token(colors.gold.200)" },
  })
);

const tabButtonActiveStyle = css({
  color: "accent.pressed",
  borderColor: "accent.default",
});

const formStyle = css({ display: "flex", flexDirection: "column", gap: "2.5" });
const fieldLabelStyle = css({ display: "block", fontSize: "sm", color: "fg.muted", marginBottom: "1.5" });
const nameUsernameRowStyle = css({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3" });
const errorTextStyle = css({ color: "danger", fontSize: "sm", textAlign: "center" });

const primaryButtonStyle = css({ width: "full", height: "11", fontWeight: "medium" });

const forgotWrapStyle = css({ textAlign: "center" });
const forgotLinkStyle = css({
  fontSize: "sm",
  color: "fg.muted",
  transition: "color 0.15s ease",
  "&:hover, &[data-hovered]": { color: "accent.pressed" },
});

const dividerWrapStyle = css({ position: "relative", marginBlock: "3" });
const dividerLineStyle = css({ position: "absolute", inset: 0, display: "flex", alignItems: "center" });
const dividerLineInnerStyle = css({ width: "full", borderTop: "1px solid", borderColor: "border.subtle" });
const dividerLabelWrapStyle = css({ position: "relative", display: "flex", justifyContent: "center", fontSize: "xs", textTransform: "uppercase" });
const dividerLabelStyle = css({ background: "bg.surface", paddingInline: "2", color: "fg.muted" });

const googleButtonStyle = css({ width: "full", height: "11", display: "flex", alignItems: "center", justifyContent: "center", gap: "3" });

const methodRowStyle = css({ display: "flex", gap: "2", marginBottom: "3" });
const methodButtonStyle = css({ flex: "1" });

const switchLineStyle = css({ textAlign: "center", fontSize: "sm", color: "fg.muted", marginTop: "3" });
const switchLinkStyle = css({
  color: "accent.pressed",
  fontWeight: "medium",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  "&:hover, &[data-hovered]": { textDecoration: "underline" },
});

const spinnerInlineStyle = css({ marginRight: "2", height: "5", width: "5", animation: "spin" });

const trustLineStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "1.5",
  fontSize: "xs",
  color: "fg.muted",
  marginTop: "3",
});

const fieldHintStyle = css({ fontSize: "xs", color: "fg.muted", marginTop: "1.5" });
const fieldHintErrorStyle = css({ color: "danger" });

const otpRowStyle = css({ display: "flex", gap: "2" });
const otpInputWrapStyle = css({ flex: "1" });

export function AuthDialog({ isOpen, onClose, onAuthSuccess }: AuthDialogProps) {
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
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpResendIn, setOtpResendIn] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupMobile, setSignupMobile] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupMethod, setSignupMethod] = useState<"email" | "mobile">("email");

  // Reset transient state whenever the tab or login method changes
  useEffect(() => {
    setError("");
    setOtpSent(false);
    setOtpCode("");
  }, [activeTab, loginMethod]);

  // Countdown for OTP resend
  useEffect(() => {
    if (otpResendIn <= 0) return;
    const timer = setInterval(() => {
      setOtpResendIn((v) => Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpResendIn]);

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
        onAuthSuccess?.();
        onClose();
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!loginIdentifier) {
      setError("Enter your email or mobile first");
      return;
    }
    setError("");
    setIsSendingOtp(true);
    try {
      await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: loginIdentifier }),
      });
      setOtpSent(true);
      setOtpResendIn(OTP_RESEND_SECONDS);
      toast.success("If an account exists, an OTP has been sent.");
    } catch {
      setError("Could not send OTP right now");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("otp", {
        identifier: loginIdentifier,
        otp: otpCode,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error || "Incorrect OTP");
      } else {
        onAuthSuccess?.();
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

    if (!USERNAME_PATTERN.test(signupUsername)) {
      setError("Username must be 3-20 characters: letters, numbers, underscores only");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          username: signupUsername,
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
        onAuthSuccess?.();
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
      <DialogContent className={contentStyle}>
        <div className={gridStyle}>
          {/* Left Panel - Full-bleed Image/Illustration */}
          <div className={imagePanelStyle}>
            <div className={carouselWrapStyle}>
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
                  className={css({ width: "full", height: "full" })}
                >
                  <CarouselContent className={css({ height: "full" })}>
                    {carouselImages.map((image, index) => (
                      <CarouselItem key={index} className={carouselSlideStyle}>
                        <Image
                          src={image}
                          alt={`${businessName} Jewelry ${index + 1}`}
                          fill
                          className={carouselImageStyle}
                          priority={index === 0}
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              ) : (
                <div className={carouselLoadingStyle}>
                  <Loader2 className={css({ height: "12", width: "12", animation: "spin", color: "accent.default" })} />
                </div>
              )}
            </div>

            {/* Branding caption, overlaid on the image with a gradient scrim */}
            <div className={brandingStyle}>
              <h2 className={brandingTitleStyle}>{businessName}</h2>
              <p className={brandingSubtitleStyle}>
                Exquisite jewelry for every moment
              </p>
            </div>
          </div>

          {/* Right Panel - Form */}
          <div className={formPanelStyle}>
            <div className={formInnerStyle}>
              {/* Welcome Text (the image panel already carries the full brand mark) */}
              <h3 className={welcomeTextStyle}>Welcome to {businessName}</h3>

              {/* Tab Switch */}
              <div className={tabRowStyle}>
                <button
                  onClick={() => setActiveTab("login")}
                  className={cx(tabButtonStyle, activeTab === "login" && tabButtonActiveStyle)}
                >
                  Login
                </button>
                <button
                  onClick={() => setActiveTab("signup")}
                  className={cx(tabButtonStyle, activeTab === "signup" && tabButtonActiveStyle)}
                >
                  Sign Up
                </button>
              </div>

              {/* Login Form */}
              {activeTab === "login" && (
                <>
                  <div className={methodRowStyle}>
                    <Button
                      type="button"
                      variant={loginMethod === "password" ? "default" : "outline"}
                      onClick={() => setLoginMethod("password")}
                      className={methodButtonStyle}
                    >
                      Password
                    </Button>
                    <Button
                      type="button"
                      variant={loginMethod === "otp" ? "default" : "outline"}
                      onClick={() => setLoginMethod("otp")}
                      className={methodButtonStyle}
                    >
                      OTP
                    </Button>
                  </div>

                  {loginMethod === "password" ? (
                    <form onSubmit={handleLogin} className={formStyle}>
                      <div>
                        <label className={fieldLabelStyle}>
                          Email or Mobile Number
                        </label>
                        <Input
                          type="text"
                          placeholder="Enter your email or mobile"
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className={fieldLabelStyle}>Password</label>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                      </div>

                      {error && <p className={errorTextStyle}>{error}</p>}

                      <Button type="submit" disabled={isLoading} className={primaryButtonStyle}>
                        {isLoading ? (
                          <>
                            <Loader2 className={spinnerInlineStyle} />
                            Signing in...
                          </>
                        ) : (
                          "Sign in"
                        )}
                      </Button>

                      <div className={forgotWrapStyle}>
                        <button
                          type="button"
                          className={forgotLinkStyle}
                          onClick={() =>
                            toast.info(
                              "Password reset is coming soon. Please contact support for now."
                            )
                          }
                        >
                          Forgot password?
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className={formStyle}>
                      <div>
                        <label className={fieldLabelStyle}>
                          Email or Mobile Number
                        </label>
                        <Input
                          type="text"
                          placeholder="Enter your email or mobile"
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>

                      {!otpSent ? (
                        <Button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp || !loginIdentifier}
                          className={primaryButtonStyle}
                        >
                          {isSendingOtp ? (
                            <>
                              <Loader2 className={spinnerInlineStyle} />
                              Sending OTP...
                            </>
                          ) : (
                            "Send OTP"
                          )}
                        </Button>
                      ) : (
                        <>
                          <div>
                            <label className={fieldLabelStyle}>
                              6-digit OTP
                            </label>
                            <div className={otpRowStyle}>
                              <div className={otpInputWrapStyle}>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={6}
                                  placeholder="Enter OTP"
                                  value={otpCode}
                                  onChange={(e) =>
                                    setOtpCode(e.target.value.replace(/\D/g, ""))
                                  }
                                  required
                                  autoFocus
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleSendOtp}
                                disabled={otpResendIn > 0 || isSendingOtp}
                              >
                                {otpResendIn > 0 ? `Resend (${otpResendIn}s)` : "Resend"}
                              </Button>
                            </div>
                            <p className={fieldHintStyle}>
                              We sent a code to {loginIdentifier}.
                            </p>
                          </div>

                          {error && <p className={errorTextStyle}>{error}</p>}

                          <Button
                            type="submit"
                            disabled={isLoading || otpCode.length !== 6}
                            className={primaryButtonStyle}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className={spinnerInlineStyle} />
                                Verifying...
                              </>
                            ) : (
                              "Verify & Sign in"
                            )}
                          </Button>
                        </>
                      )}

                      {error && !otpSent && (
                        <p className={errorTextStyle}>{error}</p>
                      )}
                    </form>
                  )}

                  <div className={dividerWrapStyle}>
                    <div className={dividerLineStyle}>
                      <div className={dividerLineInnerStyle} />
                    </div>
                    <div className={dividerLabelWrapStyle}>
                      <span className={dividerLabelStyle}>or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className={googleButtonStyle}
                  >
                    <svg className={css({ height: "5", width: "5" })} viewBox="0 0 24 24">
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

                  <p className={trustLineStyle}>
                    <ShieldCheck className={css({ height: "3.5", width: "3.5" })} />
                    Your details are encrypted and never shared
                  </p>
                </>
              )}

              {/* Signup Form */}
              {activeTab === "signup" && (
                <form onSubmit={handleSignup} className={formStyle}>
                  <div className={nameUsernameRowStyle}>
                    <div>
                      <label className={fieldLabelStyle}>Full Name</label>
                      <Input
                        type="text"
                        placeholder="Full name"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className={fieldLabelStyle}>Username</label>
                      <Input
                        type="text"
                        placeholder="Unique username"
                        value={signupUsername}
                        onChange={(e) =>
                          setSignupUsername(
                            e.target.value.replace(/[^a-zA-Z0-9_]/g, "")
                          )
                        }
                        minLength={3}
                        maxLength={20}
                        required
                      />
                    </div>
                  </div>
                  {signupUsername.length > 0 &&
                    !USERNAME_PATTERN.test(signupUsername) && (
                      <p className={cx(fieldHintStyle, fieldHintErrorStyle, css({ marginTop: "-2" }))}>
                        Username: 3-20 characters, letters/numbers/underscores only
                      </p>
                    )}

                  <div>
                    <label className={fieldLabelStyle}>Sign up with</label>
                    <div className={methodRowStyle}>
                      <Button
                        type="button"
                        variant={signupMethod === "email" ? "default" : "outline"}
                        onClick={() => setSignupMethod("email")}
                        className={methodButtonStyle}
                      >
                        Email
                      </Button>
                      <Button
                        type="button"
                        variant={signupMethod === "mobile" ? "default" : "outline"}
                        onClick={() => setSignupMethod("mobile")}
                        className={methodButtonStyle}
                      >
                        Mobile
                      </Button>
                    </div>
                  </div>

                  {signupMethod === "email" ? (
                    <div>
                      <label className={fieldLabelStyle}>Email Address</label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className={fieldLabelStyle}>Mobile Number</label>
                      <Input
                        type="tel"
                        placeholder="10 digit mobile number"
                        value={signupMobile}
                        onChange={(e) => setSignupMobile(e.target.value)}
                        pattern="[0-9]{10}"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className={fieldLabelStyle}>Password</label>
                    <Input
                      type="password"
                      placeholder="8+ characters, upper, lower & number"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      minLength={8}
                      required
                    />
                  </div>

                  {error && <p className={errorTextStyle}>{error}</p>}

                  <Button type="submit" disabled={isLoading} className={primaryButtonStyle}>
                    {isLoading ? (
                      <>
                        <Loader2 className={spinnerInlineStyle} />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>

                  <div className={dividerWrapStyle}>
                    <div className={dividerLineStyle}>
                      <div className={dividerLineInnerStyle} />
                    </div>
                    <div className={dividerLabelWrapStyle}>
                      <span className={dividerLabelStyle}>or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className={googleButtonStyle}
                  >
                    <svg className={css({ height: "5", width: "5" })} viewBox="0 0 24 24">
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

                  <p className={switchLineStyle}>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("login")}
                      className={switchLinkStyle}
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
