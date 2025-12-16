interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface ParameterTableProps {
  parameters: Parameter[];
  title?: string;
}

export const ParameterTable = ({ parameters, title = 'Parâmetros' }: ParameterTableProps) => {
  return (
    <div className="my-4">
      <h4 className="text-sm font-semibold mb-3">{title}</h4>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Nome</th>
              <th className="text-left px-4 py-2 font-medium">Tipo</th>
              <th className="text-left px-4 py-2 font-medium">Obrigatório</th>
              <th className="text-left px-4 py-2 font-medium">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param, index) => (
              <tr key={param.name} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                <td className="px-4 py-2 font-mono text-xs">{param.name}</td>
                <td className="px-4 py-2">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                    {param.type}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {param.required ? (
                    <span className="text-destructive text-xs">Sim</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Não</span>
                  )}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{param.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
