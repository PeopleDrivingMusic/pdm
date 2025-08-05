<script lang="ts">
    import { Button, Input, Link, Checkbox } from '$lib/ui';
    
    let email = '';
    let password = '';
    let rememberMe = false;
    let loading = false;
    
    async function handleLogin() {
        loading = true;
        try {
            console.log('Login attempt:', { email, password, rememberMe });
            // await login(email, password);
        } catch (error) {
            console.error('Login failed:', error);
        } finally {
            loading = false;
        }
    }
    
    function handleGoogleLogin() {
        console.log('Google login');
    }
</script>

<div class="login-wrapper">
    <div class="form-wrapper">
        <div class="form-container">
            <div class="form-header">
                <h1>Log in</h1>
                <p>Welcome back! Please enter your details.</p>
            </div>
            
            <form on:submit|preventDefault={handleLogin}>
                <Input
                    label="Email"
                    type="email"
                    placeholder="Enter your email"
                    bind:value={email}
                    required
                />
                
                <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    bind:value={password}
                    required
                />
                
                <div class="form-options">
                    <Checkbox
                        id="remember"
                        label="Remember for 30 days"
                        bind:checked={rememberMe}
                    />
                    
                    <Link color="primary">
                        Forgot password?
                    </Link>
                </div>
                
                <div class="form-buttons">
                    <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign in'}
                    </Button>
                    
                    <Button type="button" variant="google" onClick={handleGoogleLogin}>
                        <svg width="18" height="18" viewBox="0 0 18 18">
                            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.53H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                            <path fill="#FBBC05" d="M4.5 10.49a4.8 4.8 0 0 1 0-3.07V5.35H1.83a8 8 0 0 0 0 7.22l2.67-2.08z"/>
                            <path fill="#EA4335" d="M8.98 4.72c1.16 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.35L4.5 7.42a4.77 4.77 0 0 1 4.48-2.7z"/>
                        </svg>
                        Sign in with Google
                    </Button>
                </div>
            </form>
            
            <div class="form-footer">
                <span>Don't have an account?</span>
                <Link color="primary">
                    Sign up
                </Link>
            </div>
        </div>
    </div>
    
    <div class="logo-wrapper">
        <div class="dashboard-preview">
            <div class="preview-placeholder">
                <h2>PDM</h2>
                <p>Music revolution is here</p>
                
            </div>
        </div>
    </div>
</div>

<style lang="scss">
    .login-wrapper {
        display: flex;
        min-height: 100vh;
        width: 100%;
        background-color: var(--bg-primary);
        
        .form-wrapper,
        .logo-wrapper {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--space-4, 2rem);
        }
        
    }
    
    .form-container {
        width: 100%;
        max-width: 400px;
        
        .form-header {
            text-align: center;
            margin-bottom: 2rem;
            
            h1 {
                font-size: 2rem;
                font-weight: 600;
                color: var(--text-on-primary);
                margin: 0 0 0.5rem 0;
            }
            
            p {
                color: var(--text-tertiary);
                margin: 0;
                font-size: 16px;
            }
        }
        
        form {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        
        .form-options {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .form-buttons {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .form-footer {
            text-align: center;
            margin-top: 2rem;
            color: var(--text-tertiary);;
            
            span {
                margin-right: 0.5rem;
            }
        }
    }
    
    .logo-wrapper {
        background: linear-gradient(135deg,  var(--color-brand-600)  0%, var(--color-brand-800) 50%, var(--bg-tertiary) 100%);
        position: relative;
        .preview-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            h2 {
                @include text-display-2xl();
            }
        }
        
    }
    
    /* Responsive */
    @media (max-width: 768px) {
        .login-wrapper {
            flex-direction: column;
            
            .logo-wrapper {
                order: -1;
                min-height: 200px;
                display: none;
            }
        }
    }
</style>