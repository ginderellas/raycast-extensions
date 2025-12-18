import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { SAPSystem } from "./types";
import { getPassword, updateSAPSystem, validateClient, validateInstanceNumber } from "./utils";

interface EditSystemFormProps {
  system: SAPSystem;
  onSave: () => void;
}

export default function EditSystemForm({ system, onSave }: EditSystemFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");

  const [systemIdError, setSystemIdError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | undefined>();
  const [instanceError, setInstanceError] = useState<string | undefined>();
  const [clientError, setClientError] = useState<string | undefined>();
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  useEffect(() => {
    async function loadPassword() {
      const password = await getPassword(system.id);
      setCurrentPassword(password);
    }
    loadPassword();
  }, [system.id]);

  async function handleSubmit(values: {
    systemId: string;
    applicationServer: string;
    instanceNumber: string;
    client: string;
    username: string;
    password: string;
    language: string;
  }) {
    // Validate required fields
    let hasError = false;

    if (!values.systemId.trim()) {
      setSystemIdError("System ID is required");
      hasError = true;
    }
    if (!values.applicationServer.trim()) {
      setServerError("Application server is required");
      hasError = true;
    }
    if (!values.instanceNumber.trim()) {
      setInstanceError("Instance number is required");
      hasError = true;
    } else {
      const instanceValidation = validateInstanceNumber(values.instanceNumber);
      if (instanceValidation) {
        setInstanceError(instanceValidation);
        hasError = true;
      }
    }
    if (!values.client.trim()) {
      setClientError("Client is required");
      hasError = true;
    } else {
      const clientValidation = validateClient(values.client);
      if (clientValidation) {
        setClientError(clientValidation);
        hasError = true;
      }
    }
    if (!values.username.trim()) {
      setUsernameError("Username is required");
      hasError = true;
    }
    if (!values.password.trim()) {
      setPasswordError("Password is required");
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);

    try {
      await updateSAPSystem(
        system.id,
        {
          systemId: values.systemId.trim().toUpperCase(),
          applicationServer: values.applicationServer.trim(),
          instanceNumber: values.instanceNumber.trim(),
          client: values.client.trim(),
          username: values.username.trim(),
          language: values.language || "EN",
        },
        values.password,
      );

      await showToast({
        style: Toast.Style.Success,
        title: "System Updated",
        message: `${values.systemId} has been updated`,
      });

      onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Update Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit ${system.systemId}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description title="Edit SAP System" text="Update the configuration for this SAP system connection." />

      <Form.TextField
        id="systemId"
        title="System ID"
        placeholder="PRD, DEV, QAS..."
        defaultValue={system.systemId}
        error={systemIdError}
        onChange={() => setSystemIdError(undefined)}
        info="The SAP System ID (SID), typically 3 characters"
      />

      <Form.TextField
        id="applicationServer"
        title="Application Server"
        placeholder="sap-server.company.com"
        defaultValue={system.applicationServer}
        error={serverError}
        onChange={() => setServerError(undefined)}
        info="Hostname or IP address of the SAP application server"
      />

      <Form.TextField
        id="instanceNumber"
        title="Instance Number"
        placeholder="00"
        defaultValue={system.instanceNumber}
        error={instanceError}
        onChange={() => setInstanceError(undefined)}
        info="2-digit instance number (e.g., 00, 01)"
      />

      <Form.TextField
        id="client"
        title="Client"
        placeholder="100"
        defaultValue={system.client}
        error={clientError}
        onChange={() => setClientError(undefined)}
        info="3-digit client number (e.g., 100, 800)"
      />

      <Form.Separator />

      <Form.TextField
        id="username"
        title="Username"
        placeholder="Your SAP username"
        defaultValue={system.username}
        error={usernameError}
        onChange={() => setUsernameError(undefined)}
      />

      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Your SAP password"
        defaultValue={currentPassword}
        error={passwordError}
        onChange={() => setPasswordError(undefined)}
        info="Password is stored encrypted locally"
      />

      <Form.Separator />

      <Form.Dropdown id="language" title="Language" defaultValue={system.language}>
        <Form.Dropdown.Item value="EN" title="English (EN)" />
        <Form.Dropdown.Item value="DE" title="German (DE)" />
        <Form.Dropdown.Item value="FR" title="French (FR)" />
        <Form.Dropdown.Item value="ES" title="Spanish (ES)" />
        <Form.Dropdown.Item value="IT" title="Italian (IT)" />
        <Form.Dropdown.Item value="PT" title="Portuguese (PT)" />
        <Form.Dropdown.Item value="NL" title="Dutch (NL)" />
        <Form.Dropdown.Item value="PL" title="Polish (PL)" />
        <Form.Dropdown.Item value="RU" title="Russian (RU)" />
        <Form.Dropdown.Item value="ZH" title="Chinese (ZH)" />
        <Form.Dropdown.Item value="JA" title="Japanese (JA)" />
        <Form.Dropdown.Item value="KO" title="Korean (KO)" />
      </Form.Dropdown>

      <Form.Description title="" text={`Last updated: ${new Date(system.updatedAt).toLocaleString()}`} />
    </Form>
  );
}
