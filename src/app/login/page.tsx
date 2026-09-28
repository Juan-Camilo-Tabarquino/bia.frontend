"use client";

import { Alert, Button, Card, Form, Input, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useLoginMutation } from "@/features/api/apiSlice";
import { saveSession, useSession } from "@/features/auth/session";

const { Title, Text } = Typography;

// The demo credentials are documented in the README. This screen deliberately
// shows no hint and no placeholder for them: the login is part of the demo polish,
// not a place to publish test data.

const LOGIN_ERROR_FALLBACK =
  "No se pudo iniciar sesión. Revisa tu conexión e intenta de nuevo.";

interface LoginFormValues {
  username: string;
  password: string;
}

/**
 * Surfaces the backend's own error body (`{"error": "…"}`), which is what the
 * 400/401/403 cases carry, and falls back to a generic message for anything
 * else — a network failure, an unexpected shape, or a body without `error`.
 */
function loginErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "data" in error) {
    const { data } = error as { data?: unknown };
    if (typeof data === "object" && data !== null && "error" in data) {
      const { error: message } = data as { error?: unknown };
      if (typeof message === "string" && message.trim().length > 0) {
        return message;
      }
    }
  }
  return LOGIN_ERROR_FALLBACK;
}

/**
 * Login screen for the demo flow.
 *
 * Submit is disabled while the request is in flight, and every rejection shows
 * the backend's message instead of a guessed one. The form deliberately adds no
 * client-side `required` rule: the backend owns the "usuario y contraseña son
 * obligatorios" 400 and surfacing it was the point.
 */
export default function LoginPage() {
  const router = useRouter();
  const { session, ready } = useSession();
  const [login, { isLoading }] = useLoginMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // A visitor who already has a valid session never sees the form.
  useEffect(() => {
    if (ready && session) {
      router.replace("/dashboard");
    }
  }, [ready, session, router]);

  const handleFinish = useCallback(
    async (values: LoginFormValues): Promise<void> => {
      setErrorMessage(null);
      try {
        const response = await login(values).unwrap();
        if (saveSession(response.token) === null) {
          setErrorMessage(LOGIN_ERROR_FALLBACK);
          return;
        }
        router.replace("/dashboard");
      } catch (error) {
        setErrorMessage(loginErrorMessage(error));
      }
    },
    [login, router],
  );

  // Until storage has been read the answer is unknown, so render neither the
  // form (it would flash for a signed-in visitor) nor a redirect.
  if (!ready || session) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <Spin aria-label="Cargando la sesión" />
      </div>
    );
  }

  return (
    <div
      style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }}
    >
      <Card style={{ width: "100%", maxWidth: 420 }}>
        <Title level={1} style={{ marginTop: 0 }}>
          Iniciar sesión
        </Title>
        <Text type="secondary">
          Acceso al monitoreo energético de Bia.
        </Text>

        {errorMessage !== null && (
          <Alert
            role="alert"
            type="error"
            showIcon
            style={{ marginBottom: "1rem" }}
            title={errorMessage}
          />
        )}

        <Form<LoginFormValues>
          layout="vertical"
          requiredMark={false}
          onFinish={handleFinish}
        >
          <Form.Item label="Usuario" name="username">
            <Input
              autoComplete="username"
              disabled={isLoading}
            />
          </Form.Item>
          <Form.Item label="Contraseña" name="password">
            <Input.Password
              autoComplete="current-password"
              disabled={isLoading}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={isLoading}
              disabled={isLoading}
            >
              Entrar
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
