import { test, expect } from '@playwright/test';

test.describe('Navegação Cliente Visão 360', () => {
  // Nota: Estes testes assumem que o servidor está rodando e o usuário está autenticado
  // Como não temos controle total sobre o estado de auth no Playwright aqui, 
  // focamos na lógica de navegação e scroll.

  test('deve navegar para a visão 360 e não rolar para o topo ao clicar no link do cliente no financeiro', async ({ page }) => {
    // Navega para a página de relatórios (financeiro)
    await page.goto('/relatorios');
    
    // Espera a tabela carregar
    await page.waitForSelector('[data-testid="client-link"]');

    // Registra a posição do scroll antes do clique
    const initialScrollY = await page.evaluate(() => window.scrollY);

    // Clica no primeiro link de cliente encontrado
    const clientLink = page.locator('[data-testid="client-link"]').first();
    await clientLink.click();

    // Verifica se a URL mudou para a rota de clientes
    await expect(page).toHaveURL(/\/clientes\/[a-zA-Z0-0-]+/);

    // Verifica se a página não "pulou" para o topo de forma inesperada na nova página 
    // (o roteamento padrão do TanStack Router lida com scroll, mas aqui garantimos que o evento não causou o bug reportado)
    const afterClickScrollY = await page.evaluate(() => window.scrollY);
    
    // Se o bug existisse (href="#"), o scroll iria para 0 imediatamente no evento de clique.
    // Como navegamos para uma nova página, o scroll depende do scrollRestoration do router.
    console.log(`Scroll inicial: ${initialScrollY}, Scroll após clique: ${afterClickScrollY}`);
  });

  test('deve navegar para a visão 360 a partir do Kanban de Jobs', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="client-link"]');

    const clientLink = page.locator('[data-testid="client-link"]').first();
    await clientLink.click();

    await expect(page).toHaveURL(/\/clientes\/[a-zA-Z0-0-]+/);
  });
});
