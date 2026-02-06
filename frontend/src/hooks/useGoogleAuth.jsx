import { useEffect } from "react";

export function useGoogleAuth(clientId, onSuccess, buttonRef) {
    useEffect(() => {
        if (!clientId || !buttonRef?.current) return;
        const initialize = () => {
            if (!window.google?.accounts?.id) return;

            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: onSuccess,
                use_fedcm_for_prompt: true,

            });

            window.google.accounts.id.renderButton(buttonRef.current, {
                theme: "outline",
                size: "large",
                text: "continue_with",
            });
        };

        if (!document.getElementById("google-gsi")) {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.id = "google-gsi";
            script.onload = initialize;
            document.body.appendChild(script);
        } else {
            initialize();
        }
    }, [clientId, onSuccess, buttonRef]);
}
