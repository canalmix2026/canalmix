import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Sobre o CanalMix | CanalMix",
  description: "Conheça como o CanalMix organiza links de canais disponíveis na internet e mantém o acesso gratuito.",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="about-page">
        <Link className="back-link" href="/">
          <ArrowLeft aria-hidden="true" size={18} />
          <span>Voltar ao CanalMix</span>
        </Link>
        <article className="about-page__content">
          <p className="eyebrow">CanalMix</p>
          <h1>Sobre o CanalMix</h1>
          <p>
            O CanalMix é um site que reúne e organiza links de canais disponíveis na internet para facilitar a busca por opções de conteúdo.
          </p>

          <section className="about-page__section">
            <h2>Como funciona</h2>
            <p>
              O CanalMix não produz as transmissões nem mantém servidores próprios para transmitir os canais. Nosso trabalho é reunir links encontrados na internet e organizá-los no site. Quando uma fonte permite, o conteúdo é exibido por meio de um player incorporado.
            </p>
            <p>
              Como as transmissões são disponibilizadas por fontes externas, não controlamos o sinal, a qualidade nem a continuidade de cada canal. Um link ou canal pode parar de funcionar, mudar de endereço ou ficar indisponível a qualquer momento. Quando possível, atualizamos as opções e fazemos melhorias para facilitar o acesso pelo site.
            </p>
          </section>

          <section className="about-page__section">
            <h2>O CanalMix é gratuito</h2>
            <p>
              Ninguém precisa pagar para acessar ou usar o CanalMix. As contribuições por Pix são <strong>totalmente voluntárias</strong> e não são necessárias para assistir aos canais.
            </p>
            <p>
              Se você escolher doar, sua contribuição ajuda com os custos do site, manutenção, atualizações e melhorias para manter o CanalMix gratuito e disponível para todos. Qualquer valor é bem-vindo, mas doar é uma escolha de cada pessoa.
            </p>
          </section>
        </article>
      </main>
    </>
  );
}
