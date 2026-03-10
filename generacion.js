/**
 * Python to PlantUML Converter
 * Detecta TODAS las relaciones UML con sintaxis correcta
 * Filtra clases del sistema Python (ABC, object, etc.)
 * No genera interfaces artificiales
 * Detecta patrones GOF (fase de conocimiento) - comentarios + notas post-it
 */

class PythonToPlantUML {
    constructor() {
        this.archivoContenido = '';
        this.nombreArchivo = '';
        this.clases = new Map();
        this.relaciones = {
            herencia: [],
            composicion: [],
            agregacion: [],
            asociacion: [],
            dependencia: [],
            realizacion: []
        };
        this.contadorRelaciones = {
            herencia: 0, composicion: 0, agregacion: 0,
            asociacion: 0, dependencia: 0, realizacion: 0
        };
        this.patronesDetectados = [];
        
        // Clases del sistema Python a ignorar completamente
        this.clasesSistema = new Set([
            'ABC', 'object', 'type', 'Exception', 'BaseException',
            'Protocol', 'Callable', 'Iterable', 'Iterator', 'Mapping',
            'Sequence', 'Set', 'Container', 'Sized', 'Hashable',
            'Awaitable', 'Coroutine', 'AsyncIterable', 'AsyncIterator',
            'Reversible', 'SupportsInt', 'SupportsFloat', 'SupportsComplex',
            'SupportsBytes', 'SupportsAbs', 'SupportsRound', 'Generic',
            'List', 'Dict', 'Set', 'Tuple', 'Optional', 'Union', 'Any',
            'int', 'str', 'float', 'bool', 'NoneType', 'bytes', 'bytearray'
        ]);
        
        this.inicializarEventos();
    }

    inicializarEventos() {
        this.inputArchivo = document.getElementById('archivoCodigo');
        this.dropZone = document.getElementById('dropZone');
        this.fileName = document.getElementById('fileName');
        this.btnProcesar = document.getElementById('btnProcesar');
        this.btnLimpiar = document.getElementById('btnLimpiar');
        this.btnRespaldar = document.getElementById('btnRespaldar');
        this.ventanaEditar = document.getElementById('ventanaEditar');
        this.statsSection = document.getElementById('statsSection');
        this.statsGrid = document.getElementById('statsGrid');

        this.opciones = {
            herencia: document.getElementById('chkHerencia'),
            composicion: document.getElementById('chkComposicion'),
            agregacion: document.getElementById('chkAgregacion'),
            asociacion: document.getElementById('chkAsociacion'),
            dependencia: document.getElementById('chkDependencia'),
            realizacion: document.getElementById('chkRealizacion'),
            patrones: document.getElementById('chkPatrones')
        };

        this.dropZone.addEventListener('dragover', (e) => this.manejarDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.manejarDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.manejarDrop(e));
        this.dropZone.addEventListener('click', () => this.inputArchivo.click());
        this.inputArchivo.addEventListener('change', (e) => this.manejarArchivo(e.target.files[0]));
        
        this.btnProcesar.addEventListener('click', () => this.procesarCodigo());
        this.btnLimpiar.addEventListener('click', () => this.limpiarTodo());
        this.btnRespaldar.addEventListener('click', () => this.respaldarCodigo());
    }

    manejarDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.add('drag-over');
    }

    manejarDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('drag-over');
    }

    manejarDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('drag-over');
        
        const archivo = e.dataTransfer.files[0];
        if (archivo && archivo.name.endsWith('.py')) {
            this.manejarArchivo(archivo);
        } else {
            alert('Por favor, arrastra un archivo Python (.py)');
        }
    }

    manejarArchivo(archivo) {
        if (!archivo) return;
        this.nombreArchivo = archivo.name.replace('.py', '');
        this.fileName.textContent = archivo.name;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.archivoContenido = e.target.result;
            this.btnProcesar.disabled = false;
            this.btnLimpiar.disabled = false;
        };
        reader.readAsText(archivo);
    }

    procesarCodigo() {
        if (!this.archivoContenido) {
            alert('No hay codigo para procesar');
            return;
        }

        try {
            this.clases.clear();
            this.relaciones = {
                herencia: [], composicion: [], agregacion: [],
                asociacion: [], dependencia: [], realizacion: []
            };
            this.contadorRelaciones = {
                herencia: 0, composicion: 0, agregacion: 0,
                asociacion: 0, dependencia: 0, realizacion: 0
            };
            this.patronesDetectados = [];

            const plantumlCode = this.convertirPythonAPlantUML(this.archivoContenido);
            this.ventanaEditar.value = plantumlCode;
            
            this.btnRespaldar.disabled = false;
            
            this.mostrarEstadisticas();
            this.mostrarNotificacion('Codigo convertido exitosamente', 'success');
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error: ' + error.message, 'error');
        }
    }

    limpiarTodo() {
        // Limpiar datos
        this.archivoContenido = '';
        this.nombreArchivo = '';
        this.clases.clear();
        this.relaciones = {
            herencia: [], composicion: [], agregacion: [],
            asociacion: [], dependencia: [], realizacion: []
        };
        this.contadorRelaciones = {
            herencia: 0, composicion: 0, agregacion: 0,
            asociacion: 0, dependencia: 0, realizacion: 0
        };
        this.patronesDetectados = [];
        
        // Limpiar UI
        this.inputArchivo.value = '';
        this.fileName.textContent = 'Ningun archivo seleccionado';
        this.ventanaEditar.value = '';
        this.statsSection.style.display = 'none';
        this.statsGrid.innerHTML = '';
        
        // Deshabilitar botones
        this.btnProcesar.disabled = true;
        this.btnLimpiar.disabled = true;
        this.btnRespaldar.disabled = true;
        
        // Quitar clase drag-over si existe
        this.dropZone.classList.remove('drag-over');
        
        this.mostrarNotificacion('Todo limpiado - listo para nuevo archivo', 'success');
    }

    convertirPythonAPlantUML(codigo) {
        const lineas = codigo.split('\n');
        
        this.identificarClases(lineas);
        this.analizarRelaciones(lineas);
        this.analizarDependencias(lineas);
        
        // Detectar patrones GOF si esta habilitado
        if (this.opciones.patrones.checked) {
            this.detectarPatronesGOF(lineas);
        }
        
        return this.generarPlantUML();
    }

    identificarClases(lineas) {
        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            
            const matchClase = linea.match(/^class\s+(\w+)(?:\(([^)]*)\))?\s*:/);
            if (matchClase) {
                const nombreClase = matchClase[1];
                
                // Ignorar clases del sistema Python
                if (this.clasesSistema.has(nombreClase)) continue;
                
                const herencia = matchClase[2] ? matchClase[2].split(',').map(h => h.trim()) : [];
                
                const decoradores = [];
                for (let j = Math.max(0, i - 5); j < i; j++) {
                    const dec = lineas[j].trim();
                    if (dec.startsWith('@')) decoradores.push(dec);
                }
                
                this.clases.set(nombreClase, {
                    nombre: nombreClase,
                    herencia: herencia,
                    decoradores: decoradores,
                    atributos: [],
                    metodos: [],
                    esInterface: decoradores.some(d => d.includes('ABC') || d.includes('abstract')),
                    esDataclass: decoradores.some(d => d.includes('dataclass')),
                    lineaInicio: i,
                    lineasCodigo: []
                });
            }
        }
    }

    analizarRelaciones(lineas) {
        let claseActual = null;
        let indentacionClase = 0;
        let enDocstring = false;

        for (let i = 0; i < lineas.length; i++) {
            const lineaOriginal = lineas[i];
            const linea = lineaOriginal.trim();
            const indentacion = lineaOriginal.search(/\S/);
            
            if (linea.startsWith('"""') || linea.startsWith("'''")) {
                if (!(linea.length > 3 && (linea.endsWith('"""') || linea.endsWith("'''")))) {
                    enDocstring = !enDocstring;
                }
                continue;
            }
            if (enDocstring) continue;

            const matchClase = linea.match(/^class\s+(\w+)/);
            if (matchClase) {
                const nombreClase = matchClase[1];
                
                // Ignorar clases del sistema
                if (this.clasesSistema.has(nombreClase)) {
                    claseActual = null;
                    continue;
                }
                
                claseActual = this.clases.get(nombreClase);
                indentacionClase = indentacion;
                
                if (claseActual) {
                    this.procesarHerenciaYRealizacion(claseActual);
                }
                continue;
            }

            if (claseActual && indentacion > indentacionClase && linea) {
                // Guardar lineas para analisis de patrones
                claseActual.lineasCodigo.push(linea);
                this.procesarLineaClase(linea, lineas, i, claseActual);
            }
        }
    }

    procesarHerenciaYRealizacion(clase) {
        clase.herencia.forEach(padre => {
            // Ignorar object y clases del sistema
            if (padre === 'object' || this.clasesSistema.has(padre)) return;
            
            // Verificar si el padre es una clase definida por el usuario
            if (this.clases.has(padre)) {
                // Verificar si es interfaz (tiene ABC en herencia o metodos abstractos)
                const padreClase = this.clases.get(padre);
                const esInterfaz = padreClase && (padreClase.esInterface || 
                                  this.esNombreInterfaz(padre));
                
                if (esInterfaz && this.opciones.realizacion.checked) {
                    // Realizacion: clase implementa interfaz
                    this.relaciones.realizacion.push({
                        linea: `${clase.nombre} ..|> ${padre} : <<implement>>`
                    });
                    this.contadorRelaciones.realizacion++;
                } else if (this.opciones.herencia.checked) {
                    // Herencia normal
                    this.relaciones.herencia.push({
                        linea: `${padre} <|-- ${clase.nombre}`
                    });
                    this.contadorRelaciones.herencia++;
                }
            }
        });
    }

    esNombreInterfaz(nombre) {
        // Heuristicas para detectar nombres de interfaz
        return nombre.startsWith('I') && nombre.length > 1 && nombre[1] === nombre[1].toUpperCase() ||
               nombre.endsWith('Interface') ||
               nombre.endsWith('Protocol') ||
               nombre === 'Drawable'; // Caso especifico comun
    }

    procesarLineaClase(linea, lineas, index, clase) {
        const matchMetodo = linea.match(/^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/);
        if (matchMetodo) {
            this.procesarMetodo(matchMetodo, lineas, index, clase);
            return;
        }

        const matchAttr = linea.match(/self\.(\w+)\s*[:=]\s*(.+)/);
        if (matchAttr) {
            this.procesarAtributo(matchAttr[1], matchAttr[2], clase);
        }

        const matchClassAttr = linea.match(/^(\w+)\s*:\s*([\w\[\], ]+)(?:\s*=|$)/);
        if (matchClassAttr && !this.esPalabraReservada(matchClassAttr[1])) {
            this.procesarAtributoClase(matchClassAttr[1], matchClassAttr[2], clase);
        }
    }

    procesarMetodo(match, lineas, index, clase) {
        const nombreMetodo = match[1];
        const parametros = match[2];
        
        if (nombreMetodo.startsWith('_') && nombreMetodo !== '__init__') return;

        if (this.opciones.dependencia.checked) {
            this.analizarParametrosDependencia(parametros, clase);
        }

        let tipoRetorno = '';
        const lineaSiguiente = lineas[index + 1] ? lineas[index + 1].trim() : '';
        const matchReturn = lineaSiguiente.match(/^->\s*([\w\[\], ]+):/);
        if (matchReturn) {
            tipoRetorno = ': ' + matchReturn[1];
        }

        const paramsProcesados = parametros.split(',')
            .map(p => {
                const partes = p.trim().split(':');
                const nombre = partes[0].replace(/self|cls/g, '').trim();
                if (!nombre) return null;
                
                if (partes[1]) {
                    const tipo = partes[1].split('=')[0].trim();
                    return `${nombre}: ${tipo}`;
                }
                return nombre;
            })
            .filter(p => p !== null)
            .join(', ');

        let prefijo = '';
        for (let j = Math.max(0, index - 3); j < index; j++) {
            const dec = lineas[j].trim();
            if (dec === '@staticmethod' || dec === '@classmethod') prefijo = '{static} ';
            if (dec === '@abstractmethod') prefijo = '{abstract} ' + prefijo;
            if (dec === '@property') prefijo = '{property} ';
        }

        const visibilidad = nombreMetodo.startsWith('_') && !nombreMetodo.startsWith('__') ? '#' : '+';
        const nombreMostrar = nombreMetodo === '__init__' ? '<<create>>' : nombreMetodo;
        
        clase.metodos.push(`${visibilidad}${prefijo}${nombreMostrar}(${paramsProcesados})${tipoRetorno}`);
    }

    analizarParametrosDependencia(parametros, clase) {
        const tipos = parametros.match(/:\s*(\w+)/g) || [];
        
        tipos.forEach(tipoMatch => {
            const tipo = tipoMatch.replace(':', '').trim();
            
            // Ignorar tipos del sistema
            if (this.clasesSistema.has(tipo)) return;
            
            if (this.clases.has(tipo) && tipo !== clase.nombre) {
                const existe = this.relaciones.dependencia.some(r => 
                    r.linea && r.linea.includes(`${clase.nombre} ..> ${tipo}`)
                );
                
                if (!existe) {
                    this.relaciones.dependencia.push({
                        linea: `${clase.nombre} ..> ${tipo} : <<use>>`
                    });
                    this.contadorRelaciones.dependencia++;
                }
            }
        });
    }

    procesarAtributo(nombre, valor, clase) {
        if (nombre.startsWith('_')) return;

        const valorLimpio = valor.split('#')[0].trim();
        
        // COMPOSICION: self.attr = Clase()
        if (this.opciones.composicion.checked) {
            const matchNew = valorLimpio.match(/^(\w+)\s*\(/);
            if (matchNew) {
                const tipo = matchNew[1];
                // Ignorar tipos del sistema
                if (this.clasesSistema.has(tipo)) {
                    clase.atributos.push(`-${nombre}: ${tipo}`);
                    return;
                }
                
                if (this.clases.has(tipo) && tipo !== clase.nombre) {
                    this.relaciones.composicion.push({
                        linea: `${clase.nombre} *-- ${tipo} : ${nombre}`
                    });
                    this.contadorRelaciones.composicion++;
                    clase.atributos.push(`-${nombre}: ${tipo}`);
                    return;
                }
            }
        }

        // AGREGACION: colecciones
        if (this.opciones.agregacion.checked) {
            const esColeccion = /^\[|^list\(|^set\(|^dict\(|List\[|Set\[|Dict\[/.test(valorLimpio);
            if (esColeccion) {
                const matchTipo = valorLimpio.match(/\[([^\]]+)\]|^(\w+)\(/);
                if (matchTipo) {
                    const tipo = matchTipo[1] || matchTipo[2];
                    // Ignorar tipos del sistema
                    if (this.clasesSistema.has(tipo)) {
                        clase.atributos.push(`-${nombre}: ${tipo}[*]`);
                        return;
                    }
                    
                    if (this.clases.has(tipo)) {
                        this.relaciones.agregacion.push({
                            linea: `${clase.nombre} o-- ${tipo} : ${nombre}[*]`
                        });
                        this.contadorRelaciones.agregacion++;
                        clase.atributos.push(`-${nombre}: ${tipo}[*]`);
                        return;
                    }
                }
            }
        }

        // ASOCIACION: referencia simple
        if (this.opciones.asociacion.checked) {
            const matchTipo = valorLimpio.match(/^(\w+)(?:\(|$)/);
            if (matchTipo) {
                const tipo = matchTipo[1];
                // Ignorar tipos del sistema
                if (this.clasesSistema.has(tipo)) {
                    clase.atributos.push(`-${nombre}: ${tipo}`);
                    return;
                }
                
                if (this.clases.has(tipo) && tipo !== clase.nombre) {
                    const yaExiste = [...this.relaciones.composicion, ...this.relaciones.agregacion]
                        .some(r => r.linea && r.linea.includes(clase.nombre) && r.linea.includes(tipo));
                    
                    if (!yaExiste) {
                        this.relaciones.asociacion.push({
                            linea: `${clase.nombre} --> ${tipo} : ${nombre}`
                        });
                        this.contadorRelaciones.asociacion++;
                    }
                }
            }
        }

        const tipo = this.inferirTipo(valorLimpio);
        clase.atributos.push(`-${nombre}: ${tipo}`);
    }

    procesarAtributoClase(nombre, tipo, clase) {
        if (this.esPalabraReservada(nombre)) return;
        
        const tipoLimpio = tipo.trim();
        
        // Ignorar tipos del sistema
        if (this.clasesSistema.has(tipoLimpio)) {
            clase.atributos.push(`-{static}${nombre}: ${tipoLimpio}`);
            return;
        }
        
        if (this.opciones.asociacion.checked && this.clases.has(tipoLimpio)) {
            this.relaciones.asociacion.push({
                linea: `${clase.nombre} --> ${tipoLimpio} : {static}${nombre}`
            });
            this.contadorRelaciones.asociacion++;
        }

        clase.atributos.push(`-{static}${nombre}: ${tipoLimpio}`);
    }

    analizarDependencias(lineas) {
        if (!this.opciones.dependencia.checked) return;

        this.clases.forEach((clase, nombreClase) => {
            let enMetodo = false;
            let indentacionMetodo = 0;

            for (let i = clase.lineaInicio; i < lineas.length; i++) {
                const linea = lineas[i];
                const indentacion = linea.search(/\S/);
                const lineaTrim = linea.trim();

                if (indentacion <= 0 && lineaTrim.startsWith('class ')) break;

                if (lineaTrim.match(/^\s*def\s+/)) {
                    enMetodo = true;
                    indentacionMetodo = indentacion;
                    continue;
                }

                if (enMetodo && indentacion > indentacionMetodo) {
                    const matchInstancia = lineaTrim.match(/(\w+)\s*\(/g) || [];
                    matchInstancia.forEach(match => {
                        const tipo = match.replace('(', '').trim();
                        
                        // Ignorar tipos del sistema
                        if (this.clasesSistema.has(tipo)) return;
                        
                        if (this.clases.has(tipo) && tipo !== nombreClase) {
                            const yaExiste = [
                                ...this.relaciones.composicion,
                                ...this.relaciones.agregacion,
                                ...this.relaciones.asociacion,
                                ...this.relaciones.dependencia
                            ].some(r => r.linea && r.linea.includes(`${nombreClase} ..> ${tipo}`));
                            
                            if (!yaExiste) {
                                this.relaciones.dependencia.push({
                                    linea: `${nombreClase} ..> ${tipo} : <<use>>`
                                });
                                this.contadorRelaciones.dependencia++;
                            }
                        }
                    });
                }
            }
        });
    }

    // ============================================================
    // DETECCION DE PATRONES GOF (FASE DE CONOCIMIENTO)
    // ============================================================
    
    detectarPatronesGOF(lineas) {
        this.clases.forEach((clase, nombreClase) => {
            const codigoClase = clase.lineasCodigo.join('\n');
            
            // Detectar Singleton
            this.detectarSingleton(clase, codigoClase);
            
            // Detectar Factory Method
            this.detectarFactoryMethod(clase, codigoClase);
            
            // Detectar Observer
            this.detectarObserver(clase, codigoClase);
            
            // Detectar Strategy
            this.detectarStrategy(clase, codigoClase);
        });
    }

    detectarSingleton(clase, codigo) {
        // Senales fuertes de Singleton
        const tieneInstance = /__(?:instance|instancia|single|_instance)\s*[:=]/i.test(codigo);
        const tieneGetInstance = /def\s+(?:get_instance|getInstance|instance|obtener_instancia)\s*\(/i.test(codigo);
        const tieneNewControlado = /def\s+__new__\s*\(/i.test(codigo);
        const tieneLock = /(?:Lock|_lock|lock)\s*[:=]/i.test(codigo);
        
        // Debe tener al menos 2 senales para ser "muy obvio"
        const senales = [tieneInstance, tieneGetInstance, tieneNewControlado, tieneLock].filter(Boolean).length;
        
        if (senales >= 2) {
            const detalles = [];
            if (tieneInstance) detalles.push('__instance');
            if (tieneGetInstance) detalles.push('get_instance()');
            if (tieneNewControlado) detalles.push('__new__');
            if (tieneLock) detalles.push('Lock');
            
            this.patronesDetectados.push({
                patron: 'Singleton',
                clase: clase.nombre,
                mensaje: `POSIBLE PATRON: Singleton (detectado ${detalles.join(' y ')})`,
                descripcion: 'Unica instancia de clase controlada globalmente',
                referencia: 'Libro GOF: pagina 127',
                detalles: detalles
            });
        }
    }

    detectarFactoryMethod(clase, codigo) {
        // Senales de Factory Method
        const tieneCreateMethod = /def\s+(?:create|factory|crear|nuevo|build|make)_?(\w*)\s*\([^)]*\)(?:\s*->\s*(\w+))?/i.test(codigo);
        const retornaInstancia = /return\s+\w+\s*\(/i.test(codigo);
        
        // Buscar metodo que crea y retorna objeto
        const metodosCreacion = [];
        const lineas = codigo.split('\n');
        
        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i];
            const matchCreate = linea.match(/def\s+(?:create|factory|crear)_?(\w*)\s*\(/i);
            if (matchCreate) {
                // Verificar si retorna algo en las siguientes lineas
                for (let j = i + 1; j < Math.min(i + 10, lineas.length); j++) {
                    if (lineas[j].match(/return\s+(\w+)\s*\(/)) {
                        metodosCreacion.push(matchCreate[0]);
                        break;
                    }
                }
            }
        }
        
        if (metodosCreacion.length > 0 || (tieneCreateMethod && retornaInstancia)) {
            const nombreMetodo = metodosCreacion[0] || 'metodo factory';
            this.patronesDetectados.push({
                patron: 'Factory Method',
                clase: clase.nombre,
                mensaje: `POSIBLE PATRON: Factory Method (detectado ${nombreMetodo.replace('def ', '')} que retorna instancia)`,
                descripcion: 'Delega creacion de objetos a subclases o metodos especializados',
                referencia: 'Libro GOF: pagina 107',
                detalles: [nombreMetodo.replace('def ', '')]
            });
        }
    }

    detectarObserver(clase, codigo) {
        // Senales de Observer
        const tieneAttach = /def\s+(?:attach|add|subscribe|registrar|suscribir)_?(?:observer|listener|observador)?\s*\(/i.test(codigo);
        const tieneDetach = /def\s+(?:detach|remove|unsubscribe|desregistrar|eliminar)_?(?:observer|listener|observador)?\s*\(/i.test(codigo);
        const tieneNotify = /def\s+(?:notify|notificar|update|actualizar|avisar)_?(?:all|observers|todos)?\s*\(/i.test(codigo);
        const tieneListaObservers = /(?:observers|listeners|suscriptores|observadores)\s*[:=]\s*(?:\[|list\(|List\[)/i.test(codigo);
        
        // Debe tener al menos 2 senales (notify + lista, o attach+detach+notify)
        const senales = [tieneAttach, tieneDetach, tieneNotify, tieneListaObservers].filter(Boolean).length;
        
        if (senales >= 2) {
            const detalles = [];
            if (tieneAttach) detalles.push('attach()');
            if (tieneDetach) detalles.push('detach()');
            if (tieneNotify) detalles.push('notify()');
            if (tieneListaObservers) detalles.push('lista de observers');
            
            this.patronesDetectados.push({
                patron: 'Observer',
                clase: clase.nombre,
                mensaje: `POSIBLE PATRON: Observer (detectado ${detalles.join(' y ')})`,
                descripcion: 'Notifica cambios de estado a multiples objetos dependientes',
                referencia: 'Libro GOF: pagina 293',
                detalles: detalles
            });
        }
    }

    detectarStrategy(clase, codigo) {
        // Senales de Strategy
        const tieneMetodoEjecutar = /def\s+(?:execute|ejecutar|run|perform|do|apply|aplicar|strategy|estrategia)\s*\(/i.test(codigo);
        const tieneAtributoEstrategia = /self\.(?:strategy|estrategia|algorithm|algoritmo|behavior|comportamiento)\s*[:=]/i.test(codigo);
        const recibeEstrategiaEnInit = /def\s+__init__\s*\([^)]*:\s*(?:strategy|estrategia|Strategy|Estrategia)/i.test(codigo);
        const metodosIntercambiables = codigo.match(/def\s+(?:execute|ejecutar|run|perform)\w*\s*\(/gi) || [];
        
        // Buscar si hay interfaz/strategy con metodo comun
        const esInterfaz = clase.esInterface;
        const metodosAbstractos = codigo.match(/@abstractmethod/g) || [];
        
        if ((tieneMetodoEjecutar && (tieneAtributoEstrategia || recibeEstrategiaEnInit)) ||
            (esInterfaz && metodosAbstractos.length > 0 && tieneMetodoEjecutar) ||
            (metodosIntercambiables.length >= 2 && tieneAtributoEstrategia)) {
            
            const detalles = [];
            if (tieneMetodoEjecutar) detalles.push('metodo ejecutar()');
            if (tieneAtributoEstrategia) detalles.push('atributo estrategia');
            if (recibeEstrategiaEnInit) detalles.push('estrategia en constructor');
            if (esInterfaz) detalles.push('interfaz abstracta');
            
            this.patronesDetectados.push({
                patron: 'Strategy',
                clase: clase.nombre,
                mensaje: `POSIBLE PATRON: Strategy (detectado ${detalles.join(' y ')})`,
                descripcion: 'Define familia de algoritmos intercambiables y encapsulados',
                referencia: 'Libro GOF: pagina 315',
                detalles: detalles
            });
        }
    }

    esPalabraReservada(palabra) {
        const reservadas = ['class', 'def', 'if', 'for', 'while', 'return', 
                           'import', 'from', 'pass', 'raise', 'try', 'except',
                           'True', 'False', 'None'];
        return reservadas.includes(palabra);
    }

    inferirTipo(valor) {
        valor = valor.trim();
        
        if (/^["']|^f["']|^"""|^'''/.test(valor)) return 'str';
        if (valor === 'True' || valor === 'False') return 'bool';
        if (valor === 'None') return 'None';
        if (/^\d+$/.test(valor)) return 'int';
        if (/^\d+\.\d+$/.test(valor)) return 'float';
        if (/^\[/.test(valor)) return 'List';
        if (/^\{/.test(valor)) return 'Dict';
        if (/^\(/.test(valor)) return 'tuple';
        
        if (valor.includes('List[')) {
            const match = valor.match(/List\[([^\]]+)\]/);
            return match ? `List[${match[1]}]` : 'List';
        }
        if (valor.includes('Optional[')) {
            const match = valor.match(/Optional\[([^\]]+)\]/);
            return match ? `${match[1]}?` : 'Optional';
        }
        if (valor.includes('Dict[')) return 'Dict';
        if (valor.includes('Set[')) return 'Set';
        
        const matchNew = valor.match(/^(\w+)\s*\(/);
        if (matchNew) return matchNew[1];
        
        return 'any';
    }

    generarPlantUML() {
        const lineas = ['@startuml', 'skinparam classAttributeIconSize 0', ''];
        lineas.push(`title Diagrama de Clases - ${this.nombreArchivo || 'Python'}`, '');

        // Seccion de patrones GOF (comentarios arriba - fase de conocimiento)
        if (this.opciones.patrones.checked && this.patronesDetectados.length > 0) {
            lineas.push('\' ============================================================');
            lineas.push('\' SECCION DE CONOCIMIENTO: Patrones de Diseno (GOF)');
            lineas.push('\' ============================================================');
            lineas.push('\' NOTA: Esta seccion es solo informativa y educativa.');
            lineas.push('\' Los patrones detectados son sugerencias basadas en estructura.');
            lineas.push('\' No implica que el codigo implemente correctamente el patron.');
            lineas.push('\' ============================================================');
            lineas.push('\'');
            
            this.patronesDetectados.forEach(p => {
                lineas.push(`\' [?] ${p.mensaje}`);
                lineas.push(`\'     Descripcion: ${p.descripcion}`);
                lineas.push(`\'     Referencia: ${p.referencia}`);
                lineas.push(`\'`);
            });
            
            lineas.push('\' ============================================================');
            lineas.push('\' Recurso recomendado: "Design Patterns" - Gamma, Helm, Johnson, Vlissides');
            lineas.push('\' ============================================================');
            lineas.push('');
        }

        // Clases (sin clases del sistema)
        this.clases.forEach((clase, nombre) => {
            lineas.push(this.generarClase(clase));
            
            // NOTA POST-IT cerca de la clase si tiene patron detectado
            if (this.opciones.patrones.checked) {
                const patronClase = this.patronesDetectados.find(p => p.clase === nombre);
                if (patronClase) {
                    lineas.push('');
                    lineas.push(`note right of ${nombre}`);
                    lineas.push(`  **${patronClase.patron}**`);
                    lineas.push(`  ${patronClase.descripcion}`);
                    lineas.push(`  Detectado: ${patronClase.detalles.join(', ')}`);
                    lineas.push(`  Ref: ${patronClase.referencia}`);
                    lineas.push('end note');
                }
            }
            
            lineas.push('');
        });

        // Relaciones en orden de fuerza
        if (this.opciones.herencia.checked && this.relaciones.herencia.length > 0) {
            lineas.push('\' Herencia (Generalizacion)');
            this.relaciones.herencia.forEach(r => lineas.push(r.linea));
            lineas.push('');
        }

        if (this.opciones.realizacion.checked && this.relaciones.realizacion.length > 0) {
            lineas.push('\' Realizacion (Implementacion)');
            this.relaciones.realizacion.forEach(r => lineas.push(r.linea));
            lineas.push('');
        }

        if (this.opciones.composicion.checked && this.relaciones.composicion.length > 0) {
            lineas.push('\' Composicion (todo-parte fuerte)');
            this.relaciones.composicion.forEach(r => lineas.push(r.linea));
            lineas.push('');
        }

        if (this.opciones.agregacion.checked && this.relaciones.agregacion.length > 0) {
            lineas.push('\' Agregacion (todo-parte debil)');
            this.relaciones.agregacion.forEach(r => lineas.push(r.linea));
            lineas.push('');
        }

        if (this.opciones.asociacion.checked && this.relaciones.asociacion.length > 0) {
            lineas.push('\' Asociacion (referencia estructural)');
            this.relaciones.asociacion.forEach(r => lineas.push(r.linea));
            lineas.push('');
        }

        if (this.opciones.dependencia.checked && this.relaciones.dependencia.length > 0) {
            lineas.push('\' Dependencia (uso temporal)');
            this.relaciones.dependencia.forEach(r => lineas.push(r.linea));
            lineas.push('');
        }

        lineas.push('@enduml');
        return lineas.join('\n');
    }

    generarClase(clase) {
        const lineas = [];
        
        let estereotipo = '';
        if (clase.esInterface) estereotipo = ' <<interface>>';
        else if (clase.esDataclass) estereotipo = ' <<dataclass>>';
        
        lineas.push(`class ${clase.nombre}${estereotipo} {`);
        
        if (clase.atributos.length > 0) {
            lineas.push('    ' + clase.atributos.join('\n    '));
        }
        
        if (clase.atributos.length > 0 && clase.metodos.length > 0) {
            lineas.push('    --');
        }
        
        if (clase.metodos.length > 0) {
            lineas.push('    ' + clase.metodos.join('\n    '));
        }
        
        lineas.push('}');
        return lineas.join('\n');
    }

    mostrarEstadisticas() {
        const total = Object.values(this.contadorRelaciones).reduce((a, b) => a + b, 0);
        
        if (total === 0) {
            this.statsSection.style.display = 'none';
            return;
        }

        const nombres = {
            herencia: 'Herencia <|--',
            composicion: 'Composicion *--',
            agregacion: 'Agregacion o--',
            asociacion: 'Asociacion -->',
            dependencia: 'Dependencia ..>',
            realizacion: 'Realizacion ..|>'
        };

        const colores = {
            herencia: '#2563eb',
            composicion: '#dc2626',
            agregacion: '#ea580c',
            asociacion: '#059669',
            dependencia: '#64748b',
            realizacion: '#7c3aed'
        };

        this.statsGrid.innerHTML = Object.entries(this.contadorRelaciones)
            .filter(([_, count]) => count > 0)
            .map(([tipo, count]) => `
                <div class="stat-item" style="border-left-color: ${colores[tipo]}">
                    <div class="stat-count">${count}</div>
                    <div class="stat-label">${nombres[tipo]}</div>
                </div>
            `).join('');

        this.statsSection.style.display = 'block';
    }

    respaldarCodigo() {
        const codigo = this.ventanaEditar.value;
        if (!codigo.trim()) {
            alert('No hay codigo para respaldar');
            return;
        }

        const blob = new Blob([codigo], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        
        const fecha = new Date().toISOString().split('T')[0];
        const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        enlace.href = url;
        enlace.download = `${this.nombreArchivo || 'diagrama'}_${fecha}_${hora}.puml`;
        
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
        
        URL.revokeObjectURL(url);
        this.mostrarNotificacion('Archivo descargado', 'success');
    }

    mostrarNotificacion(mensaje, tipo) {
        const notifAnterior = document.querySelector('.notification');
        if (notifAnterior) notifAnterior.remove();

        const notif = document.createElement('div');
        notif.className = `notification ${tipo}`;
        notif.textContent = mensaje;
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            background: ${tipo === 'success' ? '#28a745' : '#dc3545'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(notif);
        
        setTimeout(() => {
            notif.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PythonToPlantUML();
});

