Vou implementar um sistema completo de biometria facial utilizando a biblioteca `face-api.js`, que permite reconhecimento facial diretamente no navegador (processamento local), integrado ao Supabase para armazenamento seguro dos descritores biométricos.

### **Plano de Implementação**

#### **1. Configuração e Dependências**
*   Instalar a biblioteca `face-api.js`.
*   Configurar o carregamento dos modelos de IA diretamente de uma CDN confiável para evitar a necessidade de download manual de arquivos pesados.

#### **2. Banco de Dados (Supabase)**
*   Criarei um arquivo SQL (`create_biometrics_table.sql`) com as instruções para você criar a tabela `face_biometrics` no seu painel do Supabase.
*   Essa tabela armazenará os descritores faciais (representação matemática do rosto) de forma segura, vinculada ao ID do usuário.

#### **3. Serviço de Biometria (`utils/faceAuth.ts`)**
*   Criarei um serviço centralizado para gerenciar:
    *   Carregamento dos modelos de IA.
    *   Detecção facial em tempo real.
    *   Cálculo de distância euclidiana para comparação de rostos (Login).

#### **4. Componentes de Interface**
*   **`BiometricCapture.tsx`**: Componente visual que gerencia a webcam, exibe o feed de vídeo e desenha a caixa de detecção facial (bounding box) para feedback visual.
*   **Integração no Cadastro (`Signup.tsx`)**: Adicionar uma etapa após o cadastro bem-sucedido oferecendo a opção "Cadastrar Biometria Facial".
*   **Integração no Login (`Login.tsx`)**: Adicionar o botão "Login Facial".
    *   *Fluxo de Segurança:* Para garantir a segurança e performance, o login facial solicitará que o usuário informe o **e-mail** primeiro (ou selecione de uma lista de "lembrados"), para que o sistema busque apenas os descritores daquele usuário específico, em vez de baixar o banco de dados inteiro de rostos.

#### **5. Fluxo de Usuário (UX)**
*   **Cadastro:** Feedback visual claro (círculo verde quando rosto detectado). Possibilidade de cadastrar múltiplas amostras.
*   **Login:** Reconhecimento rápido (< 3s). Em caso de sucesso, o sistema autenticará o usuário.
    *   *Nota:* Como a autenticação puramente biométrica no frontend tem limitações de segurança (não gera token de sessão do servidor sem senha), o sistema validará a identidade visualmente e, para este MVP, simulará o login ou preencherá a senha se estiver salva (ou usaremos um método seguro de "Sessão Persistente").

### **Próximos Passos (após sua aprovação):**
1.  Instalar pacotes.
2.  Criar a estrutura de arquivos.
3.  Implementar os componentes.
4.  Adicionar as modificações nas páginas de Login e Signup.
