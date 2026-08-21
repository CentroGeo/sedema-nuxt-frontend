// config de identidad visual: perfil de color de sisdai para toda la instancia
// mismo storage que identidad-gobmx (useStorage('landingBuilder'), driver fs)

export const PERFILES_SISDAI_DISPONIBLES = [
  'predeterminada',
  'gema',
  'eni',
  'sigic',
  'personalizado',
] as const;
export type PerfilSisdai = (typeof PERFILES_SISDAI_DISPONIBLES)[number];

export interface EstilosInstanciaConfig {
  perfil: PerfilSisdai;
  // color base del perfil 'personalizado', el resto se deriva de este
  // (shared/utils/generarPaletaSisdai.ts). se conserva al cambiar de perfil
  colorBase: string | null;
  actualizadoEn: string;
}

const ESTILOS_INSTANCIA_KEY = 'estilos-instancia.json';

const configPorDefecto: EstilosInstanciaConfig = {
  perfil: 'sigic',
  colorBase: null,
  actualizadoEn: new Date(0).toISOString(),
};

export async function getEstilosInstancia(): Promise<EstilosInstanciaConfig> {
  const storage = useStorage('landingBuilder');
  const valor = await storage.getItem<EstilosInstanciaConfig>(ESTILOS_INSTANCIA_KEY);
  return { ...configPorDefecto, ...valor };
}

export async function setEstilosInstancia(
  cambios: Partial<Omit<EstilosInstanciaConfig, 'actualizadoEn'>>
): Promise<EstilosInstanciaConfig> {
  const storage = useStorage('landingBuilder');
  const actual = await getEstilosInstancia();

  const nuevaConfig: EstilosInstanciaConfig = {
    perfil: cambios.perfil ?? actual.perfil,
    colorBase: cambios.colorBase !== undefined ? cambios.colorBase : actual.colorBase,
    actualizadoEn: new Date().toISOString(),
  };

  await storage.setItem(ESTILOS_INSTANCIA_KEY, nuevaConfig);
  return nuevaConfig;
}

export function validarPerfil(valor: unknown): valor is PerfilSisdai {
  return (
    typeof valor === 'string' && (PERFILES_SISDAI_DISPONIBLES as readonly string[]).includes(valor)
  );
}
