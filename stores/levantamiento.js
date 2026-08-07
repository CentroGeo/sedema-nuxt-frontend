import { defineStore } from 'pinia';

export const useLevantamientoStore = defineStore('levantamiento', () => {
  const config = useRuntimeConfig();
  const apiUrl = config.public.levantamientoBackendUrl;

  return {
    catalogoColapsado: ref(false),
    idNavegacionLateral: 'navegacionlateral-' + Math.random().toString(36).substring(2),
    existenProyectos: ref(false),
    participantes: ref([]),
    existenParticipantes: ref(false),
    existeFormulario: ref(false),
    proyectos: ref([]),
    proyectosPublicos: ref([]),
    descargasAprobadas: ref([]),
    existenDescargasAprobadas: ref(false),
    descargasEnRevision: ref([]),
    existenDescargasEnRevision: ref(false),
    esEdicionFormulario: ref(true),
    proyectosCompartidos: ref([]),
    esRevisor: ref(false),
    existenProyectosAprobados: ref(false),
    proyectosAprobados: ref([]),
    existenProyectosEnRevision: ref(false),
    proyectosEnRevision: ref([]),
    existenProyectosRechazados: ref(false),
    proyectosRechazados: ref([]),

    async obtenerProyectosPublicos() {
      try {
        const data = await $fetch(`${apiUrl}/projects/public`);
        this.proyectosPublicos = data.proyectos;
      } catch (err) {
        console.error('Error cargando proyectos:', err);
      }
    },

    alternarCatalogoColapsable() {
      this.catalogoColapsado = !this.catalogoColapsado;
    },

    alternarParticipantes() {
      this.existenParticipantes = !this.existenParticipantes;
    },

    alternarFormulario() {
      this.existeFormulario = !this.existeFormulario;
    },

    async guardarProyecto(formData) {
      try {
        const response = await fetch(`${apiUrl}/projects/create`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.message || 'Error al guardar el proyecto');
          error.data = errorData;
          throw error;
        }

        const data = await response.json();
        const proyectoConAportaciones = {
          ...data.proyecto,
          num_aportaciones: '0',
        };

        this.proyectos.unshift(proyectoConAportaciones);
        this.existenProyectos = true;
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    },

    obtenerTotalProyectos() {
      return this.proyectos.length;
    },

    obtenerTotalProyectosPublicos() {
      return this.proyectosPublicos.length;
    },

    async obtenerProyectoPorId(email, id) {
      try {
        const body = {
          email: email,
        };

        const data = await $fetch(`${apiUrl}/projects/register/${id}`, {
          method: 'POST',
          body: body,
        });

        if (data.proyectos[0].es_privada) {
          this.existenParticipantes = false;
        } else {
          this.existenParticipantes = true;
        }
        return data.proyectos[0];
      } catch (err) {
        console.error('Error cargando proyecto:', err);
      }
    },
    async crearAporte(formData) {
      const response = await fetch(`${apiUrl}/raising/user/create`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || 'Error al enviar el aporte');
        error.data = errorData;
        throw error;
      }

      return response.json();
    },
    async actualizarAporte(id, formData) {
      const response = await fetch(`${apiUrl}/raising/user/update/${id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || 'Error al actualizar el aporte');
        error.data = errorData;
        throw error;
      }

      return response.json();
    },
    async obtenerDetalleAporte(id) {
      return $fetch(`${apiUrl}/raising/user/register/v2`, {
        method: 'POST',
        body: { id_levantamiento: id },
      });
    },
    async obtenerAportesPorEstado(email, status) {
      const data = await $fetch(`${apiUrl}/raising/user/list`, {
        method: 'POST',
        body: { email, status },
      });

      return data.levantamientos || [];
    },
    async obtenerMensajesAporte(id) {
      return $fetch(`${apiUrl}/raising/chat/list`, {
        method: 'POST',
        body: { id },
      });
    },
    async eliminarAporte(id) {
      return $fetch(`${apiUrl}/raising/user/register/${id}`, {
        method: 'DELETE',
      });
    },
    obtenerTotalDescargasAprobadas() {
      return this.descargasAprobadas.length;
    },

    async obtenerDescargasAportesRevision(email, status, page = 1) {
      const data = await $fetch(`${apiUrl}/downloads/reviewer/list`, {
        method: 'POST',
        query: { page },
        body: { email, status },
      });
      return {
        descargas: data?.descargas || [],
        pagination: data?.pagination || { page, total: 0, totalPages: 1 },
      };
    },

    async revisarDescargaAportes(id, payload) {
      return $fetch(`${apiUrl}/downloads/reviewer/status/${id}`, {
        method: 'POST',
        body: payload,
      });
    },
    async actualizarStatusAporte(payload, idAporte) {
      try {
        const response = await fetch(`${apiUrl}/raising/reviewer/status/${idAporte}`, {
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.message || 'Error al actualizar el estado del aporte');
          error.data = errorData;
          throw error;
        }

        const data = await response.json();
        console.log('Estado de aporte actualizado en BD:', data);
        return data;
      } catch (error) {
        console.error('Error en actualizarStatusAporte:', error);
        throw error;
      }
    },

    async obtenerTotalDescargasEnRevision(user_id) {
      try {
        const response = await $fetch(`${apiUrl}/downloads/user/list`, {
          method: 'POST',
          body: {
            email: user_id,
            page: 1,
            limit: 10,
            status: 'NO REVISADO',
          },
        });

        this.descargasEnRevision = response;
        this.existenDescargasEnRevision = response?.descargas?.length > 0;

        console.log('lista descarga:', response);
        return response?.descargas?.length ?? 0;
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    },

    async eliminarDescargaEnRevision(id, usr) {
      try {
        const response = await $fetch(`${apiUrl}/downloads/user/${id}`, {
          method: 'DELETE',
          body: {
            id,
            email: usr,
          },
        });

        console.log('descarga eliminada:', response);
        return response;
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    },
    async solicitarDescarga(formData) {
      try {
        const response = await $fetch(`${apiUrl}/downloads/owner/downloads`, {
          method: 'POST',
          body: {
            user_id: formData.get('user_id'),
            project_name: formData.get('project_name'),
            descriptionFileToExport: formData.get('descriptionFileToExport'),
            project_id: formData.get('project_id'),
          },
        });

        console.log(response);

        console.log('Descarga solicitada:', response);
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    },
    async obtenerMisProyectos(email) {
      try {
        const body = {
          email: email,
        };

        const data = await $fetch(`${apiUrl}/projects/own`, {
          method: 'POST',
          body: body,
        });
        console.log(data);
        this.proyectos = data.proyectos;
        if (data.proyectos.length > 0) {
          this.existenProyectos = true;
        }
      } catch (err) {
        console.error('Error cargando proyectos:', err);
      }
    },
    async actualizarProyecto(formData, idProyecto) {
      try {
        const response = await fetch(`${apiUrl}/projects/update/${idProyecto}`, {
          method: 'PUT',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Error al actualizar el proyecto');
        }

        const data = await response.json();
        console.log('Proyecto actualizado:', data);
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    },
    async obtenerParticipantesPorProyecto(email, idProyecto) {
      try {
        const body = {
          user_id: email,
        };

        const data = await $fetch(`${apiUrl}/projects/shared/${idProyecto}/user/list`, {
          method: 'POST',
          body: body,
        });
        console.log(data);
        this.participantes = data.usuarios;
        if (data.usuarios.length > 0) {
          this.existenParticipantes = true;
        }
      } catch (err) {
        console.error('Error cargando participantes:', err);
      }
    },
    async agregarParticipanteProyecto(userEmail, email, rol, idProyecto, message) {
      try {
        // El backend almacena el mensaje junto con la invitación del participante.
        const body = {
          user_id: userEmail,
          email: email,
          rol: rol,
          message: message,
        };

        const data = await $fetch(`${apiUrl}/projects/shared/${idProyecto}/user/add`, {
          method: 'POST',
          body: body,
        });
        console.log(data);
      } catch (err) {
        console.error('Error guardando participante:', err);
        throw err;
      }
    },
    async actualizarParticipanteProyecto(userEmail, rol, idProyecto, idParticipante) {
      try {
        const body = {
          user_id: userEmail,
          rol: rol,
        };

        const data = await $fetch(
          `${apiUrl}/projects/shared/${idProyecto}/user/${idParticipante}/update`,
          {
            method: 'POST',
            body: body,
          }
        );
        return data;
      } catch (err) {
        console.error('Error actualizando participante:', err);
        throw err;
      }
    },
    async eliminarParticipanteProyecto(userEmail, idProyecto, idParticipante) {
      try {
        const body = {
          user_id: userEmail,
        };

        const data = await $fetch(
          `${apiUrl}/projects/shared/${idProyecto}/user/${idParticipante}/remove`,
          {
            method: 'DELETE',
            body: body,
          }
        );
        return data;
      } catch (err) {
        console.error('Error eliminando participante:', err);
        throw err;
      }
    },
    async actualizarFormularioParticipantesProyecto(payload, idProyecto) {
      try {
        const response = await fetch(`${apiUrl}/projects/update/${idProyecto}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.message || 'Error al actualizar el proyecto');
          error.data = errorData;
          throw error;
        }

        const data = await response.json();
        console.log('Proyecto enviado a aprobación:', data);
        return data;
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    },
    async eliminarProyecto(userEmail, idProyecto) {
      try {
        const body = {
          user_id: userEmail,
        };

        const data = await $fetch(`${apiUrl}/projects/deactivate/${idProyecto}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: body,
        });
        console.log(data);
      } catch (err) {
        console.error('Error eliminando proyecto:', err);
      }
    },
    async obtenerProyectosCompartidos(email) {
      try {
        const body = {
          email: email,
        };

        const data = await $fetch(`${apiUrl}/projects/shared`, {
          method: 'POST',
          body: body,
        });

        this.proyectosCompartidos = data.proyectos;
      } catch (err) {
        console.error('Error cargando proyectos compartidos:', err);
      }
    },
    obtenerTotalProyectosCompartidos() {
      return this.proyectosCompartidos.length;
    },
    async obtenerEsRevisor(email) {
      try {
        const body = {
          email: email,
        };

        const data = await $fetch(`${apiUrl}/notifications/user/rol`, {
          method: 'POST',
          body: body,
        });

        this.esRevisor = data.is_reviewer;
      } catch (err) {
        console.error('Error cargando rol usuario:', err);
      }
    },
    obtenerTotalProyectosEnRevision() {
      return this.proyectosEnRevision.length;
    },
    async obtenerProyectosEnRevision(email) {
      try {
        const body = {
          email: email,
          status: 'EN REVISION',
        };

        const data = await $fetch(`${apiUrl}/projects/reviewer/list`, {
          method: 'POST',
          body: body,
        });

        this.proyectosEnRevision = data.proyectos;
        if (data.proyectos.length > 0) {
          this.existenProyectosEnRevision = true;
        }
      } catch (err) {
        console.error('Error obteniendo proyectos por status:', err);
      }
    },
    async obtenerProyectosRechazados(email) {
      try {
        const body = {
          email: email,
          status: 'RECHAZADO',
        };

        const data = await $fetch(`${apiUrl}/projects/reviewer/list`, {
          method: 'POST',
          body: body,
        });

        this.proyectosRechazados = data.proyectos;
        if (data.proyectos.length > 0) {
          this.existenProyectosRechazados = true;
        }
      } catch (err) {
        console.error('Error obteniendo proyectos por status:', err);
      }
    },
    async actualizarStatusProyecto(payload, idProyecto) {
      try {
        const response = await fetch(`${apiUrl}/projects/reviewer/status/${idProyecto}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.message || 'Error al actualizar el proyecto');
          error.data = errorData;
          throw error;
        }

        const data = await response.json();
        console.log('Proyecto enviado a aprobación:', data);
        return data;
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    },
    async obtenerProyectosAprobados(email) {
      try {
        const body = {
          email: email,
          status: 'APROBADO',
        };

        const data = await $fetch(`${apiUrl}/projects/reviewer/list`, {
          method: 'POST',
          body: body,
        });

        this.proyectosAprobados = data.proyectos;
        if (data.proyectos.length > 0) {
          this.existenProyectosAprobados = true;
        }
      } catch (err) {
        console.error('Error obteniendo proyectos por status:', err);
      }
    },
    obtenerTotalProyectosAprobados() {
      return this.proyectosAprobados.length;
    },
    obtenerTotalProyectosRechazados() {
      return this.proyectosRechazados.length;
    },
  };
});
