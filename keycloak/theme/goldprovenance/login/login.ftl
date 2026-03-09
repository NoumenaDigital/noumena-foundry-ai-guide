<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        <h1 id="kc-page-title">${msg("loginAccountTitle")}</h1>
    <#elseif section = "form">
        <div id="kc-form">
            <div id="kc-form-wrapper">
                <#if realm.password>
                    <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                        <#if !usernameHidden??>
                            <div class="pf-c-form__group">
                                <label for="username" class="pf-c-form__label">
                                    <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                                </label>
                                <input tabindex="1" id="username" class="pf-c-form-control" name="username"
                                    value="${(login.username!'')}"
                                    type="text" autofocus autocomplete="off"
                                    aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                                <#if messagesPerField.existsError('username','password')>
                                    <span class="alert-error">${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}</span>
                                </#if>
                            </div>
                        </#if>

                        <div class="pf-c-form__group">
                            <label for="password" class="pf-c-form__label">${msg("password")}</label>
                            <input tabindex="2" id="password" class="pf-c-form-control" name="password"
                                type="password" autocomplete="off"
                                aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                        </div>

                        <div id="kc-form-options">
                            <#if realm.rememberMe && !usernameHidden??>
                                <div class="checkbox">
                                    <label>
                                        <#if login.rememberMe??>
                                            <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox" checked> ${msg("rememberMe")}
                                        <#else>
                                            <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"> ${msg("rememberMe")}
                                        </#if>
                                    </label>
                                </div>
                            </#if>
                            <div>
                                <#if realm.resetPasswordAllowed>
                                    <a tabindex="5" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
                                </#if>
                            </div>
                        </div>

                        <div id="kc-form-buttons">
                            <input tabindex="4" class="pf-c-button pf-m-primary" name="login" id="kc-login" type="submit" value="${msg("doLogIn")}" />
                        </div>
                    </form>
                </#if>
            </div>
        </div>
    </#if>
</@layout.registrationLayout>
