Vou implementar a funcionalidade de cadastro biométrico na tela de Configurações (`Settings.tsx`), permitindo que usuários existentes ativem o login facial.

### **Plano de Implementação**

#### **1. Integração no Componente `Settings.tsx`**
*   **Estado de Biometria:** Criar um estado `hasBiometrics` para verificar se o usuário já possui biometria cadastrada. Isso será checado ao carregar a página consultando a tabela `face_biometrics`.
*   **Estado de Controle:** Criar estados `showBiometricCapture` (para abrir o modal) e `isSavingBiometric` (feedback de carregamento).
*   **Lógica do Toggle/Div:**
    *   Substituir o `input checkbox` estático por um controle real.
    *   Ao clicar na `div` ou no `toggle`:
        *   Se **já possui biometria**: Exibir um diálogo de confirmação para remover a biometria.
        *   Se **não possui biometria**: Abrir o componente `BiometricCapture` em modo `enroll` (cadastro).

#### **2. Fluxo de Cadastro (Callback)**
*   Implementar a função `handleBiometricCapture` que recebe o descritor facial do componente `BiometricCapture`.
*   Salvar o descritor na tabela `face_biometrics` vinculado ao ID do usuário autenticado.
*   Atualizar o estado local para refletir que a biometria está ativa.
*   Exibir feedback de sucesso (ex: "Biometria cadastrada com sucesso!").

#### **3. Fluxo de Remoção**
*   Adicionar lógica para remover o registro da tabela `face_biometrics` caso o usuário desative a opção.

### **Benefícios**
*   **Acessibilidade:** A `div` inteira será clicável, facilitando a interação em dispositivos móveis.
*   **Feedback Visual:** O toggle refletirá o estado real do banco de dados (ativado apenas se houver biometria salva).
*   **Segurança:** Utiliza a mesma infraestrutura segura implementada anteriormente (`faceAuth.ts`, RLS no Supabase).

### **Próximos Passos (após sua aprovação):**
1.  Modificar `Settings.tsx` para importar `BiometricCapture`, `descriptorToArray` e adicionar a lógica descrita.
